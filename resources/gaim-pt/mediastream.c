/**
 * (C) 2005 Tim Hentenaar <tim@hentsoft.com>
 *
 * gaim
 *
 * Gaim is the legal property of its developers, whose names are too numerous
 * to list here.  Please refer to the COPYRIGHT file distributed with this
 * source distribution.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 */
#include "internal.h"
#include "mediastream.h"
#include "network.h"
#include "notify.h"
#include "prefs.h"
#include "proxy.h"
#include "request.h"
#include "util.h"
#include "codec.h"
#include "device.h"
#include "debug.h"
#include "gsm.h"

static gpointer get_gsm_codec();
static void gsm_codec_get_format(void **format);

static GaimMediaStreamUiOps *stream_ui_ops = NULL;

static void gaim_media_stream_destroy(GaimMediaStream *stream)
{
	GaimMediaDeviceHandle *h;
	g_return_if_fail(stream != NULL);

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","gaim_media_stream_destroy(%p)\n",stream);
#endif

	h = stream->device;
	if (stream->status == GAIM_MEDIA_STREAM_STATUS_STARTED)
		gaim_media_stream_cancel_local(stream);

	if (stream->ui_ops && stream->ui_ops->destroy)
		stream->ui_ops->destroy(stream);

	if (stream->who)       g_free(stream->who);
	if (stream->remote_ip) g_free(stream->remote_ip);
	if (stream->message)   g_free(stream->message);
	if (stream->format)    g_free(stream->format);
	if (stream->w_thread)  g_thread_join(stream->w_thread);
	if (stream->codec)     ((GaimCodec *)(stream->codec))->uninit(stream->codec);
	if (h)                 h->unref(h);
	g_free(stream);
}

GaimMediaStream *gaim_media_stream_new(GaimAccount *account, GaimMediaStreamType type, 
				       const char *who, const char *mime)
{
	GaimMediaStream *stream; GaimMediaDeviceHandle *dev; 
	
	g_return_val_if_fail(account != NULL,NULL);

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","gaim_media_stream_new(%p,%d,%p,%p)\n",account,type,who,mime);
#endif
	
	stream         = g_new0(GaimMediaStream,1);
	stream->ref    = 1;
	stream->frames = 1;
	stream->type   = type;
	stream->ui_ops = stream_ui_ops;
	stream->a      = account;
	stream->who    = who ? g_strdup(who) : NULL;
	stream->codec  = get_gsm_codec();
	stream->device = gaim_device_open(OPT_MEDIA_DEVICE_PLAYBACK,OPT_MEDIA_DEVICE_AUDIO);
	
	if (!stream->device) {
		gaim_media_stream_unref(stream);
		return NULL;
	}

	dev = stream->device;
	if (!stream->format) gsm_codec_get_format(&stream->format);
	if (stream->format) dev->set_format(dev,stream->format);
	

//	if (stream->ui_ops && stream->ui_ops->new_stream)
//		stream->ui_ops->new_stream(stream);
	
	return stream;
}

void gaim_media_stream_ref(GaimMediaStream *stream) { 
	g_return_if_fail(stream != NULL);
	stream->ref++;
}

void gaim_media_stream_unref(GaimMediaStream *stream) {
	g_return_if_fail(stream != NULL);
	stream->ref--;

	if (stream->ref == 0) gaim_media_stream_destroy(stream);
}

GaimMediaStreamType gaim_media_stream_get_type(const GaimMediaStream *stream)
{
	g_return_val_if_fail(stream != NULL,GAIM_MEDIA_STREAM_UNKNOWN);
	return stream->type;
}

GaimAccount *gaim_media_stream_get_account(const GaimMediaStream *stream)
{
	g_return_val_if_fail(stream != NULL,NULL);
	return stream->a;
}

GaimMediaStreamStatusType gaim_media_stream_get_status(const GaimMediaStream *stream)
{
	g_return_val_if_fail(stream != NULL,GAIM_MEDIA_STREAM_STATUS_UNKNOWN);
	return stream->status;
}

gboolean gaim_media_stream_is_canceled(const GaimMediaStream *stream)
{
	g_return_val_if_fail(stream != NULL,TRUE);
	return (stream->status > GAIM_MEDIA_STREAM_STATUS_STARTED);
}

int gaim_media_stream_get_local_port(const GaimMediaStream *stream)
{
	g_return_val_if_fail(stream != NULL,-1);
	return stream->local_port;
}

const char *gaim_media_stream_get_remote_ip(const GaimMediaStream *stream)
{
	g_return_val_if_fail(stream != NULL,NULL);
	return stream->remote_ip;
}

int gaim_media_stream_get_remote_port(const GaimMediaStream *stream)
{
	g_return_val_if_fail(stream != NULL,-1);
	return stream->remote_port;
}

GaimMediaStreamUiOps *gaim_media_stream_get_ui_ops(const GaimMediaStream *stream)
{
	g_return_val_if_fail(stream != NULL,NULL);
	return stream->ui_ops;
}

void gaim_media_stream_set_read_fnc(GaimMediaStream *stream,
		                    ssize_t (*fnc)(GaimMediaStream *,char **,int))
{
	g_return_if_fail(stream != NULL);
	stream->ops.read = fnc;
}

void gaim_media_stream_set_write_fnc(GaimMediaStream *stream,
		                     ssize_t (*fnc)(GaimMediaStream *, const char **, size_t))
{
	g_return_if_fail(stream != NULL);
	stream->ops.write = fnc;
}

void gaim_media_stream_set_ack_fnc(GaimMediaStream *stream,
				   void (*fnc)(GaimMediaStream *, const char *, size_t))
{
	g_return_if_fail(stream != NULL);
	stream->ops.ack = fnc;
}

void gaim_media_stream_set_request_denied_fnc(GaimMediaStream *stream,
		                              void (*fnc)(GaimMediaStream *))
{
	g_return_if_fail(stream != NULL);
	stream->ops.request_denied = fnc;
}

void gaim_media_stream_set_init_fnc(GaimMediaStream *stream, void (*fnc)(GaimMediaStream *))
{
	g_return_if_fail(stream != NULL);
	stream->ops.init = fnc;
}

void gaim_media_stream_set_start_fnc(GaimMediaStream *stream, void (*fnc)(GaimMediaStream *))
{
	g_return_if_fail(stream != NULL);
	stream->ops.start = fnc;
}

void gaim_media_stream_set_end_fnc(GaimMediaStream *stream, void (*fnc)(GaimMediaStream *))
{
	g_return_if_fail(stream != NULL);
	stream->ops.end = fnc;
}

void gaim_media_stream_set_cancel_send_fnc(GaimMediaStream *stream, void (*fnc)(GaimMediaStream *))
{
	g_return_if_fail(stream != NULL);
	stream->ops.cancel_send = fnc;
}

void gaim_media_stream_set_cancel_recv_fnc(GaimMediaStream *stream, void (*fnc)(GaimMediaStream *))
{
	g_return_if_fail(stream != NULL);
	stream->ops.cancel_recv = fnc;
}

void gaim_media_streams_set_ui_ops(GaimMediaStreamUiOps *ops) 
{
	g_return_if_fail(ops != NULL);
	stream_ui_ops = ops;
}

GaimMediaStreamUiOps *gaim_media_streams_get_ui_ops()
{
	return stream_ui_ops;
}

void gaim_media_stream_request(GaimMediaStream *stream)
{
	g_return_if_fail(stream != NULL);
	g_return_if_fail(stream->ops.init != NULL);
#if 0
	/* I'll implement this when I get Oscar audio working. */
	gaim_media_stream_ref(stream);

	if (stream->dir == GAIM_MEDIA_STREAM_DIRECTION_RECEIVE) {
		if (stream->status == GAIM_MEDIA_STREAM_STATUS_ACCEPTED) 
			gaim_media_stream_ask_recv(stream);
		else    gaim_media_stream_ask_accept(stream);
	} else	        gaim_media_stream_ask_send(stream);
#endif	

}

void gaim_media_stream_pause(GaimMediaStream *stream)
{
	GaimMediaDeviceHandle *dev;
	
	g_return_if_fail(stream != NULL);

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","gaim_media_stream_pause(%p)\n",stream);
#endif

	stream->status = (stream->status &  GAIM_MEDIA_STREAM_STATUS_PAUSED) ? 
			 (stream->status & ~GAIM_MEDIA_STREAM_STATUS_PAUSED) :
			 (stream->status |  GAIM_MEDIA_STREAM_STATUS_PAUSED);
	dev = stream->device;
	dev->pause(dev);
}	

void gaim_media_stream_request_accepted(GaimMediaStream *stream)
{
	g_return_if_fail(stream != NULL);
	g_return_if_fail(stream->ops.init != NULL);

	stream->status = GAIM_MEDIA_STREAM_STATUS_ACCEPTED;
	stream->ops.init(stream);
}

void gaim_media_stream_request_denied(GaimMediaStream *stream)
{
	g_return_if_fail(stream != NULL);

	if (stream->ops.request_denied) stream->ops.request_denied(stream);
	gaim_media_stream_unref(stream);
}

ssize_t gaim_media_stream_read(GaimMediaStream *stream, char **buffer)
{
	GaimCodec *c; GaimMediaDeviceHandle *h;
	ssize_t r = -1, s = 0; char *cbuf = NULL; int i,o;

	g_return_val_if_fail(stream != NULL,-1);
	g_return_val_if_fail(buffer != NULL,-1);

	c = stream->codec;
	if (!(h = stream->device)) return -1;

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","gaim_media_stream_read(%p,%p)\n",stream,buffer);
#endif

	if (stream->codec) s = c->get_frame_size(TRUE);
	else               s = h->get_frame_size(stream->device);

	if (s <= 0) return -1;

	buffer = g_malloc(s);
	if (stream->ops.read) r = stream->ops.read(stream,buffer,s);
	else                  r = read(stream->sock,*buffer,s);
	if (r <= 0) return r;

	if (!(stream->status & GAIM_MEDIA_STREAM_STATUS_PAUSED)) {
		for (i=0;i<r/s;i++) { /* There _can_ be more than 1 frame / packet. */
			if (stream->codec) {
				o = c->decode(c,(*buffer+(s*i)),(char **)&cbuf);
				h->add_buffer(h,cbuf,o);
			} else  h->add_buffer(h,(*buffer+(s*i)),s);
		}
	}
	return r;
}

static gpointer do_write(gpointer data) 
{
	GaimMediaStream *stream = data; GaimMediaDeviceHandle *h; GaimCodec *c; long r=0,fs,fse; 
	char **cbuf; void *buffer; int i;

	if (!stream)         g_thread_exit(NULL); 
	if (!stream->device) g_thread_exit(NULL);

	h = stream->device;
	c = stream->codec;

	if (c) { fs = c->get_frame_size(FALSE); fse = c->get_frame_size(TRUE); }
	else   { fse = fs = h->get_frame_size(h); }

	cbuf = g_new0(char *,stream->frames+1);
	buffer = g_new0(char,fs);
	
	while (stream->do_write) {
		while (stream->status & GAIM_MEDIA_STREAM_STATUS_PAUSED) usleep(1);
		if (!stream->do_write) break;
		if (stream->frames <= 0) {
			stream->w_thread = NULL;
			g_free(cbuf);
			g_thread_exit(NULL);
		}

		for (i=0;i<stream->frames;i++) {
			r = h->read(h,buffer,fs);
			if (r < 0 || !buffer) {
				g_free(cbuf); 
				stream->w_thread = NULL;
				g_thread_exit(NULL);
			}
				
			if (c) c->encode(c,buffer,&cbuf[i]);
			else {
				cbuf[i] = g_malloc(fse);
				memcpy(&cbuf[i],buffer,fse);
			}
			usleep(1);
		}
	
		if (gaim_media_stream_write(stream,(const char **)cbuf,stream->frames,fs*stream->frames)<0) {
				g_strfreev(cbuf); g_free(buffer);
				gaim_media_stream_cancel_remote(stream);
				g_thread_exit(NULL);
		}
		usleep(1);
	}
	g_free(buffer);
	g_strfreev(cbuf); 
	g_thread_exit(NULL);
	return NULL;
}

void gaim_media_stream_start_write(GaimMediaStream *stream) 
{
	g_return_if_fail(stream != NULL);
	if (!stream->do_write) return;

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","gaim_media_stream_start_write(%p)\n",stream);
#endif

	if (!stream->w_thread && stream->do_write)
		stream->w_thread = g_thread_create(do_write,stream,TRUE,NULL);
}

ssize_t gaim_media_stream_write(GaimMediaStream *stream, const char **buffers, size_t n, size_t s)
{
	GaimCodec *c; GaimMediaDeviceHandle *h; ssize_t r = 0; int i,q;
	g_return_val_if_fail(stream  != NULL,-1);
	g_return_val_if_fail(buffers != NULL,-1);

	c = stream->codec;
	if (!(h = stream->device)) return -1;

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","gaim_media_stream_write(%p)\n",stream);
#endif
	
	if (stream->codec) q = c->get_frame_size(TRUE);
	else               q = h->get_frame_size(h);

	if (stream->ops.write) r = stream->ops.write(stream,buffers,s);
	else for (i=0;i<n;i++) r += write(stream->sock,buffers[i],q);
	
	return r;
}

/* This is where we git 'r done. */
static void media_xfer_cb(gpointer data, int fd, GaimInputCondition cond)
{
	GaimMediaStream *stream = data;
	int r = -1; char *buffer = NULL;

	if (stream->do_write) return;
	if ((r = gaim_media_stream_read(stream,&buffer)) < 0) 
		gaim_media_stream_cancel_remote(stream);
	
	if (buffer) {
		if (stream->ops.ack) stream->ops.ack(stream,buffer,r);
		g_free(buffer);
	}
}

static void default_connect_cb(gpointer data, int fd, GaimInputCondition cond)
{
	GaimMediaStream *stream = data;
	g_return_if_fail(stream != NULL);
	g_return_if_fail(fd > 0);

	cond = GAIM_INPUT_READ;
	stream->sock    = fd;
	stream->watcher = gaim_input_add(fd,cond,media_xfer_cb,stream);
	if (stream->ops.start) stream->ops.start(stream);
}

void gaim_media_stream_start(GaimMediaStream *stream, int fd, const char *ip, unsigned int port)
{
	g_return_if_fail(stream != NULL);
	g_return_if_fail(ip != NULL);
	g_return_if_fail(port > 0);

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","gaim_media_stream_start(%p,%d,%p,%d)\n",stream,fd,ip,port);
#endif

	
	stream->status = GAIM_MEDIA_STREAM_STATUS_STARTED;
	
	if (stream->remote_ip) g_free(stream->remote_ip);
	
	stream->remote_ip   = g_strdup(ip);
	stream->remote_port = port;

	if (fd > 0) default_connect_cb(stream,fd,GAIM_INPUT_READ);
	else 	    gaim_proxy_connect(stream->a,stream->remote_ip,stream->remote_port,
				       default_connect_cb,stream);
}

void gaim_media_stream_end(GaimMediaStream *stream)
{
	g_return_if_fail(stream != NULL);

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","gaim_media_stream_end(%p)\n",stream);
#endif

	
	if (stream->ops.end)  stream->ops.end(stream);
	if (stream->watcher) {
		gaim_input_remove(stream->watcher);
		stream->watcher = 0;
	}

	if (stream->sock) {
		close(stream->sock);
		stream->sock = 0;
	}

	gaim_media_stream_unref(stream);
}

static void gaim_media_stream_conv_write(GaimMediaStream *stream, char *msg, gboolean err)
{
	GaimMessageFlags flags = GAIM_MESSAGE_SYSTEM;
	GaimConversation *c = NULL;
	
	if (!stream->who) return;

#ifdef PALTALK_TRACING
	gaim_debug_misc("paltalk","gaim_media_stream_conv_write(%p,%p(\"%s\"),%d)\n",stream,msg,msg,err);
#endif
	
	if (!(c = gaim_find_conversation_with_account(stream->who,stream->a))) return;
	if (err) flags |= GAIM_MESSAGE_ERROR;
	gaim_conversation_write(c,NULL,msg,flags,time(NULL));
}

void gaim_media_stream_cancel_local(GaimMediaStream *stream)
{
	char *msg;
	
	g_return_if_fail(stream != NULL);
	
	stream->status = GAIM_MEDIA_STREAM_CANCEL_LOCAL;
	msg            = g_strdup(_("You cancelled the media stream"));

	if (stream->who) gaim_media_stream_conv_write(stream,msg,FALSE);
	g_free(msg);

	if (stream->dir == GAIM_MEDIA_STREAM_DIRECTION_SEND && stream->ops.cancel_send) 
		stream->ops.cancel_send(stream);
	else if (stream->dir == GAIM_MEDIA_STREAM_DIRECTION_RECEIVE && stream->ops.cancel_recv)
		stream->ops.cancel_recv(stream);
	else if (stream->dir == GAIM_MEDIA_STREAM_DIRECTION_BOTH && stream->ops.cancel_recv)
		stream->ops.cancel_recv(stream);

	if (stream->watcher) {
		gaim_input_remove(stream->watcher);
		stream->watcher = 0;
	}

	if (stream->sock) {
		close(stream->sock);
		stream->sock = 0;
	}

	if (stream->ui_ops && stream->ui_ops->cancel_local) 
		stream->ui_ops->cancel_remote(stream);
	
	gaim_media_stream_unref(stream);
}

void gaim_media_stream_cancel_remote(GaimMediaStream *stream)
{
	char *msg;
	
	g_return_if_fail(stream      != NULL);
	
	stream->status = GAIM_MEDIA_STREAM_CANCEL_REMOTE;
	if (stream->who) msg = g_strdup_printf(_("%s cancelled the media stream"),stream->who);
	else             msg = g_strdup_printf(_("The media stream was cancelled by the other end"));
	
	gaim_media_stream_error(stream,stream->dir,stream->who,msg);

	if (stream->watcher) {
		gaim_input_remove(stream->watcher);
		stream->watcher = 0;
	}

	if (stream->sock) {
		close(stream->sock);
		stream->sock = 0;
	}

	if (stream->ui_ops && stream->ui_ops->cancel_remote) 
		stream->ui_ops->cancel_remote(stream);
	
	gaim_media_stream_unref(stream);
}

void gaim_media_stream_error(GaimMediaStream *stream, GaimMediaStreamDirection dir, const char *who,
			     const char *msg)
{
	g_return_if_fail(stream != NULL);
	g_return_if_fail(dir != GAIM_MEDIA_STREAM_DIRECTION_UNKNOWN);
	g_return_if_fail(msg != NULL);

	gaim_media_stream_conv_write(stream,(char *)msg,FALSE);
}

static void gsm_codec_init(GaimCodec *codec)
{
	if (codec->encode_data) gsm_destroy(codec->encode_data);
	if (codec->decode_data) gsm_destroy(codec->decode_data);
	codec->encode_data = gsm_create();
	codec->decode_data = gsm_create();
}

static void gsm_codec_get_format(void **format)
{
	GaimAudioFormat *fmt;
	
	g_return_if_fail(format != NULL);
	
	fmt           = g_new0(GaimAudioFormat,1);
	fmt->type     = GAIM_AUDIO_SIGNED;
	fmt->rate     = 8000;	/* 8 KHz        */
	fmt->channels = 1;	/* Mono         */
	fmt->spc      = 50;	/* 20 ms (in us)*/
	fmt->bps      = 16;	/* 16-bit Audio */
	*(GaimAudioFormat **)format = fmt;
}

static int gsm_codec_get_frame_size(gboolean encoded)
{
	return encoded ? 33 : 320;
}

static int gsm_codec_encode(GaimCodec *codec, void *in, char **out)
{
	g_return_val_if_fail(in && out,-1);
	*out = g_malloc(33);
	gsm_encode(codec->encode_data,(gsm_signal *)in,(gsm_byte *)(*out));
	return 33;
}

static int gsm_codec_decode(GaimCodec *codec, void *in, char **out)
{
	g_return_val_if_fail(codec && in && out,-1);
	*out = g_malloc(320);
	gsm_decode(codec->decode_data,(gsm_byte *)in,(gsm_signal *)(*out));
	return 320;
}

static void gsm_codec_uninit(GaimCodec *codec)
{
	if (codec->encode_data) gsm_destroy(codec->encode_data);
	if (codec->decode_data) gsm_destroy(codec->decode_data);
	g_free(codec);
}

static GaimCodec gsm_codec_info = {
	OPT_CODEC_AUDIO,		/* type           */
	NULL,				/* encode_data    */
	NULL,				/* decode_data    */
	gsm_codec_init,			/* init           */
	gsm_codec_get_format,		/* get_format     */
	gsm_codec_get_frame_size,	/* get_frame_size */
	gsm_codec_encode,		/* encode         */
	gsm_codec_decode,		/* decode         */
	gsm_codec_uninit		/* uninit         */
};

static gpointer get_gsm_codec() {
	GaimCodec *c = g_new0(GaimCodec,1);
	memcpy(c,&gsm_codec_info,sizeof(GaimCodec));
	gsm_codec_init(c);
	return (gpointer)c;
}
