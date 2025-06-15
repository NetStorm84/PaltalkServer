/* Paltalk Protocol Plugin for Gaim
 * (C) 2004,2005 Tim Hentenaar	<tim@hentsoft.com>
 *
 * This is a product of packet analysis, reverse engineering, and a lot of patience ;)
 *
 * Largely based on observations from Paltalk 5.x.
 * Some notes and/or updates from packet captures of Paltalk 8.0. 
 * 
 * Note: Most of my orginal documentation was scribbled down in handwritten form, and in a 
 * textfile that only a dead person could love. ;)
 *
 */

#include "paltalk.h"
#include "mediastream.h"
#include "rtp.h"
#include "debug.h"

static gint speaker_timeout  = 0;
static GTimer *speaker_timer = NULL;
static short rtpseq          = 1;		/* XXX: This should be random */

static gboolean check_speaker_flag(gpointer data) 
{
	GaimMediaStream *stream = data; PTRoomData *rd = stream->data;
	GaimConnection *gc; GaimConversation *c; long ltmp; char *ctmp = NULL;

	if (!rd || !speaker_timer) return FALSE;

	gc      = gaim_account_get_connection(stream->a);
	c       = gaim_find_chat(gc,rd->id);

	/* Remove the speaking flag for the speaker */
	if (rd->speaker && g_timer_elapsed(speaker_timer,&ltmp) > 0.45) {
		ltmp = gaim_conv_chat_user_get_flags(GAIM_CONV_CHAT(c),rd->speaker);
		gaim_conv_chat_user_set_flags(GAIM_CONV_CHAT(c),rd->speaker,
					      ltmp & ~(GAIM_CBFLAGS_SPEAKING));

		ctmp = g_strdup_printf(_("%s has stopped speaking."),rd->speaker);
		gaim_conv_chat_write(GAIM_CONV_CHAT(c),_("System"),ctmp,GAIM_MESSAGE_RECV|GAIM_MESSAGE_SYSTEM,time(NULL));

		g_free(ctmp);
		g_free(rd->speaker); 
		g_timer_stop(speaker_timer);
		rd->speaker = NULL;
	} 

	return TRUE;
}

static ssize_t pt_media_stream_audio_write(GaimMediaStream *stream, const char **buffers, size_t size)
{
	PTData *ptd; PTRoomData *rd; long ltmp; char *packet;
	
	if (!stream || !buffers || size == 0) return -1;
	if (!*buffers) return -1;
	
	rd  = stream->data;
	ptd = rd->ptd;

	if (rd->speaker) return 0;

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","pt_media_stream_audio_write(%p,%p,%d)\n",stream,buffers,size);
#endif

	/* Build the RTP packet */
	rtpseq++;
	packet               = g_malloc(148);
	*(short *)(packet)   = htons(0x8003);
	*(short *)(packet+2) = htons(rtpseq);
	*(long *)(packet+4)  = htonl(time(NULL));
	*(long *)(packet+8)  = htonl(ptd->uin);
	for (ltmp=0;ltmp<4;ltmp++) memcpy(packet+12+(33*ltmp),buffers[ltmp],33);
	memcpy(packet+144,&ptd->uin,4);
	
	/* Git 'r done */
	ltmp = htonl(148);
	write(stream->sock,&ltmp,4);
	write(stream->sock,packet,148); 
	g_free(packet);
	return 148;
}

static ssize_t pt_media_stream_audio_read(GaimMediaStream *stream,char **buffer,int s)
{
	RTPPacket *rtp; PTRoomData *rd; GaimConnection *gc; GaimConversation *c; 
	PTData *ptd; long ltmp; char *ctmp, *ctmp2, *ctmp3, *ctmp4; int i,j;

	if (!buffer || !stream) return -1;

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","pt_media_stream_audio_read(%p,%p,%d)\n",stream,buffer,s);
#endif

	rd   = stream->data;
	ptd  = rd->ptd;
	ctmp = g_malloc(1);
	
	for (i=0;i<4;i++) {	/* XXX: a length of 4 should work, goddamnit. */
		read(stream->sock,ctmp,1);
		ltmp = *ctmp & 0xFF;
	}
	
	if (ltmp <= 0 || ltmp >= 150) {
		g_free(ctmp);
		return 0;
	}

	/* Read the RTP Packet */
	g_free(ctmp);
	ctmp = g_malloc(ltmp);
	read(stream->sock,ctmp,ltmp);

	/* Parse the RTP Packet */
	rtp = rtp_packet_parse(ctmp,ltmp);
	g_free(ctmp);
	if (!rtp) {
		*buffer = NULL;
		return 0;
	}

	if (rtp->payload_type != 3 || rtp->payload_len < 136) {
//		gaim_debug_misc("paltalk","Payload Type: %d, Payload Len: %d\n",
//				rtp->payload_type,rtp->payload_len);
		rtp_packet_destroy(rtp);
		*buffer = NULL;
		return 0;
	}

//	if (rtp->payload_len > 136) 
//		gaim_debug_misc("paltalk-mediastream","Packet too big: %d\n",rtp->payload_len);

	if (!speaker_timer)   speaker_timer   = g_timer_new();
	if (!speaker_timeout) speaker_timeout = gaim_timeout_add(500,check_speaker_flag,stream);
	g_timer_start(speaker_timer);

	/* Set the speaking flag */
	gc      = gaim_account_get_connection(stream->a);
	c       = gaim_find_chat(gc,rd->id);
	ctmp2   = g_strdup_printf("%ld",rtp->ssrc);
	ctmp3   = pt_get_cb_real_name(gc,rd->id,ctmp2);

	/* Set the speaking flag for the speaker */
	if (rd->speaker && strcmp(ctmp3,rd->speaker)) {
		ltmp = gaim_conv_chat_user_get_flags(GAIM_CONV_CHAT(c),ctmp3);
		gaim_conv_chat_user_set_flags(GAIM_CONV_CHAT(c),ctmp3,
					      ltmp & ~(GAIM_CBFLAGS_SPEAKING));

		ctmp4 = g_strdup_printf(_("%s has stopped speaking."),ctmp3);
		gaim_conv_chat_write(GAIM_CONV_CHAT(c),_("System"),ctmp4,GAIM_MESSAGE_RECV|GAIM_MESSAGE_SYSTEM,time(NULL));
		g_free(ctmp4);
		ctmp4 = g_strdup_printf(_("%s has started speaking."),ctmp3);
		gaim_conv_chat_write(GAIM_CONV_CHAT(c),_("System"),ctmp4,GAIM_MESSAGE_RECV|GAIM_MESSAGE_SYSTEM,time(NULL));
		g_free(ctmp4);

		g_free(rd->speaker);
	} else if (!rd->speaker) {
		ctmp4 = g_strdup_printf(_("%s has started speaking."),ctmp3);
		gaim_conv_chat_write(GAIM_CONV_CHAT(c),_("System"),ctmp4,GAIM_MESSAGE_RECV|GAIM_MESSAGE_SYSTEM,time(NULL));
		g_free(ctmp4);

	}
	
	ltmp = gaim_conv_chat_user_get_flags(GAIM_CONV_CHAT(c),ctmp3) | GAIM_CBFLAGS_SPEAKING;
	gaim_conv_chat_user_set_flags(GAIM_CONV_CHAT(c),ctmp3,ltmp);
	rd->speaker = g_strdup(ctmp3);
	
	g_free(ctmp3);
	g_free(ctmp2);

	/* Git 'r done */
	*buffer = g_malloc(rtp->payload_len);
	memcpy(*buffer,rtp->payload,rtp->payload_len);

	ltmp = rtp->payload_len;
	rtp_packet_destroy(rtp);

	/* If this isn't the currently focused chat, we don't need to return any data */
	i = gaim_conversation_get_index(c);
	if (gaim_conv_window_get_conversation_count(c->window) > 1) {
		j=gaim_conversation_get_index(gaim_conv_window_get_active_conversation(c->window));
		if (i != j) {
			ltmp = 0;
			g_free(*buffer);
		}
	} 
	return ltmp;
}

void pt_media_stream_destroy(GaimMediaStream *stream)
{
	PTRoomData *rd;
	
	if (!stream) return;

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","pt_media_stream_destroy(%p)\n",stream);
#endif
	
	rd = stream->data;
	
	gaim_timeout_remove(speaker_timeout);
	gaim_media_stream_unref(stream);
	g_timer_destroy(speaker_timer);

	if (rd && rd->speaker) g_free(rd->speaker);
}

static void pt_media_stream_audio_start(GaimMediaStream *stream) 
{
	PTRoomData *rd; PTData *ptd; long ltmp;

	if (!stream) return;

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","pt_media_stream_audio_start(%p)\n",stream);
#endif
	
	rd = stream->data; ptd = rd->ptd;
	
	ltmp = htonl(rd->id);   write(stream->sock,&ltmp,4);
	ltmp = htonl(ptd->uin); write(stream->sock,&ltmp,4);
	pt_send_packet(ptd,PACKET_ROOM_MEDIA_SERVER_ACK,rd->id,1);
}

static void pt_media_stream_req_mic(GaimMediaStream *stream)
{
	PTRoomData *rd; PTData *ptd;

	if (!stream) return;

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","pt_media_stream_req_mic(%p)\n",stream);
#endif
	
	rd = stream->data; ptd = rd->ptd;
	stream->m_req = stream->m_req ? FALSE : TRUE;

	pt_send_packet(ptd,stream->m_req ? PACKET_ROOM_REQUEST_MIC : PACKET_ROOM_UNREQUEST_MIC,
		       rd->id);
}

void pt_media_stream_audio_connect(PTData *data, PTRoomData *rd, const char *ip, short port) 
{
	GaimMediaStream *stream; 

	if (!ip || port <= 0 || !rd || !data) return;

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","pt_media_stream_audio_connect(%p,%p,%p,%d)\n",data,rd,ip,port);
#endif
	
	stream = gaim_media_stream_new(data->a,GAIM_MEDIA_STREAM_AUDIO,NULL,"audio/gsm");

	if (!stream) {
		rd->stream = NULL;
		return;
	}

	/* Set options   */
	stream->frames      = 4;
	stream->dir         = GAIM_MEDIA_STREAM_DIRECTION_BOTH;
	stream->w_throttle  = 20;

	/* Set callbacks */
	stream->ops.start   = pt_media_stream_audio_start;
	stream->ops.read    = pt_media_stream_audio_read;
	stream->ops.write   = pt_media_stream_audio_write;
	stream->ops.req_mic = pt_media_stream_req_mic;
	rd->stream          = stream;
	stream->data        = rd;

	gaim_media_stream_start(stream,-1,ip,port);
}
