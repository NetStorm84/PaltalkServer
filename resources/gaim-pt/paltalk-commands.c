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
#include "server.h"
#include "cmds.h"
#include "request.h"

static void pt_do_bounce(PTRoomData *data, const char *reason)
{
	if (!reason || !data->u_bounce) return;
	pt_send_packet(data->ptd,PACKET_ROOM_BOUNCE_USER,data->id,data->u_bounce);
	pt_send_packet(data->ptd,PACKET_ROOM_BOUNCE_REASON,reason,data->id,data->u_bounce);
	data->u_bounce = 0;
}

static gboolean i_am_owner(PTRoomData *rd, gboolean strict)
{
	GList *tmp;

	if (rd->owner == ((PTData *)(rd->ptd))->uin) return TRUE;
	if (rd->admin) {
		for (tmp=rd->users;tmp && tmp->data;tmp=tmp->next) {
			if (atol(g_hash_table_lookup(tmp->data,"uid")) == rd->owner) return FALSE;
			if (atoi(g_hash_table_lookup(tmp->data,"admin")) == 1)       return FALSE;
		}
		if (!strict) return TRUE;
	}
	return FALSE;
}

static GaimCmdRet pt_whisper(GaimConversation *c, const char *cmd, char **args, char **error, 
		             void *data)
{
	GaimConnection *gc; long rid; char *buf,*w,*q;

	gc  = gaim_conversation_get_gc(c);
	rid = GAIM_CONV_CHAT(c)->id;
	
	if (!(w = strchr(args[0],':'))) {
		*error = g_strdup(_("No nickname specified."));
		return GAIM_CMD_RET_FAILED;
	}
	*w = 0; w++; q = strrchr(args[0],'>'); *q = 0; q++; 
	
	buf = g_strdup_printf("%s>/w %s: %s",args[0],q,w);

	if (!strchr(buf,'\n')) {
		gaim_conv_chat_write(GAIM_CONV_CHAT(c),q,w,
				     GAIM_MESSAGE_WHISPER | GAIM_MESSAGE_SEND,time(NULL));
		pt_send_packet(gc->proto_data,PACKET_ROOM_MESSAGE_OUT,buf,rid);
	} else  gaim_conv_chat_write(GAIM_CONV_CHAT(c),NULL,
				   _("Your whisper wasn't sent because it contained line breaks."),
		                   GAIM_MESSAGE_SYSTEM | GAIM_MESSAGE_NO_LOG,time(NULL));
	g_free(buf); 
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_ban(GaimConversation *c, const char *cmd, char **args, char **error, 
		         void *data)
{
	GaimConnection *gc; PTRoomData *rd; PTData *ptd; char *tmp; long id,uin;
	
	id  = GAIM_CONV_CHAT(c)->id; 
	gc  = gaim_conversation_get_gc(c); 
	rd  = pt_get_room_data(gc->proto_data,id); 
	ptd = rd->ptd;
	
	if (!i_am_owner(rd,TRUE)) {
		*error = g_strdup(_("This command can only be used by the room's owner."));
		return GAIM_CMD_RET_FAILED;
	}

	if (!data && !rd->ban) {
		*error = g_strdup(_("No users are currently banned."));
		return GAIM_CMD_RET_FAILED;
	}
	
	if (atoi(args[0]) <= 0 && strcmp(args[0],"all")) { 
		tmp = pt_get_cb_real_name(gc,id,args[0]); 
		uin = atol(tmp); 
		g_free(tmp);
	} else if (!strcmp(args[0],"all")) uin = 0xFFFFFFFF;
	else uin = atol(args[0]);

	pt_send_packet(gc->proto_data,data ? PACKET_ROOM_BAN_USER : PACKET_ROOM_UNBAN_USER,id,uin);
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_listbans(GaimConversation *c, const char *cmd, char **args, char **error, 
		              void *data)
{
	GaimConnection *gc; PTRoomData *rd; GString *s; GList *tmp; char *ctmp,*ctmp2; 

	gc = gaim_conversation_get_gc(c);
	rd = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	
	if (!rd->admin) {
		*error = g_strdup(_("You are not an admin in this room."));
		return GAIM_CMD_RET_FAILED;
	}

	if (data && !rd->ban) {
		*error = g_strdup(_("No users are currently banned."));
		return GAIM_CMD_RET_FAILED;
	} 

	if (!data && !rd->bounce) {
		*error = g_strdup(_("No users are currently bounced."));
		return GAIM_CMD_RET_FAILED;
	}

	s = g_string_new("");
	g_string_append_printf(s,_("The following users are currently %s:\n"),
				 data ? _("banned") : _("bounced"));

	for (tmp=data ? rd->ban : rd->bounce;tmp && tmp->data;tmp=tmp->next) {
		ctmp  = g_strdup(tmp->data);
		ctmp2 = strchr(tmp->data,',');
		g_string_append_printf(s,"\t%s\n",ctmp2+1);
		g_free(ctmp);
	}

	gaim_conversation_write(c,NULL,s->str,GAIM_MESSAGE_NO_LOG,time(NULL));
	pt_send_packet(gc->proto_data,PACKET_ROOM_GET_ADMIN_INFO,GAIM_CONV_CHAT(c)->id);	

	g_string_free(s,TRUE);
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_bounce(GaimConversation *c, const char *cmd, char **args, char **error, 
		            void *data)
{
	GaimConnection *gc; PTRoomData *rd; char *tmp; long uin;
	
	gc = gaim_conversation_get_gc(c); 
	rd = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	
	if (!rd->admin) {
		*error = g_strdup(_("You're not an admin in this room."));
		return GAIM_CMD_RET_FAILED;
	}

	if (!data && !rd->bounce) {
		*error = g_strdup(_("No users are currently bounced."));
		return GAIM_CMD_RET_FAILED;
	}
	
	if (atoi(args[0]) <= 0) { 
		tmp = pt_get_cb_real_name(gc,rd->id,args[0]); 
		uin = atol(tmp); 
		g_free(tmp);
	} else uin = atol(args[0]);

	if (data) {
		rd->u_bounce = uin;
		gaim_request_input(gc,_("Bounce a User"),
				   _("Paltalk staff will use your reason to track repeat offenders "
				     "and determine if further administrative action against them "
				     "is warranted.\nThis message is not seen by the user whom "
				     "you're bouncing."),
			           _("Type your reason for bouncing the user."),
			           NULL,FALSE,FALSE,NULL,
			           _("Bounce"),G_CALLBACK(pt_do_bounce),
			           _("Cancel"),NULL,rd);
	} else pt_send_packet(gc->proto_data,PACKET_ROOM_UNBOUNCE_USER,rd->id,uin);
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_mode_m(GaimConversation *c, const char *cmd, char **args, char **error, 
		            void *data)
{
	GaimConnection *gc; PTRoomData *rd; 

	gc = gaim_conversation_get_gc(c); 
	rd = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	
	if (!rd->admin) {
		*error = g_strdup(_("You are not an admin in this room."));
		return GAIM_CMD_RET_FAILED;
	}

	pt_send_packet(gc->proto_data,PACKET_ROOM_TOGGLE_ALL_MICS,rd->id,data ? 1 : 0);
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_clear_hands(GaimConversation *c, const char *cmd, char **args, char **error, 
		            	 void *data)
{
	GaimConnection *gc; PTRoomData *rd; 

	gc = gaim_conversation_get_gc(c); 
	rd = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	
	if (!rd->admin) {
		*error = g_strdup(_("You are not an admin in this room."));
		return GAIM_CMD_RET_FAILED;
	}

	pt_send_packet(gc->proto_data,PACKET_ROOM_REMOVE_ALL_HANDS,rd->id);
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_red_dot(GaimConversation *c, const char *cmd, char **args, char **error, 
		             void *data)
{
	GaimConnection *gc; PTRoomData *rd; char *tmp; long uin;
	
	gc = gaim_conversation_get_gc(c); 
	rd = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	
	if (!rd->admin) {
		*error = g_strdup(_("You are not an admin in this room."));
		return GAIM_CMD_RET_FAILED;
	}
	
	if (!strcmp(args[0],"all")) {
		uin = 0xffffffffL;
	} else {
		if (atoi(args[0]) <= 0) { 
			tmp = pt_get_cb_real_name(gc,rd->id,args[0]); 
			uin = atol(tmp); 
			g_free(tmp);
		} else uin = atol(args[0]);
	}
	
	pt_send_packet(gc->proto_data,
		       data ? PACKET_ROOM_RED_DOT_USER : PACKET_ROOM_UNRED_DOT_USER,
		       rd->id,uin);
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_close_room(GaimConversation *c, const char *cmd, char **args, char **error, 
		                void *data)
{
	GaimConnection *gc; PTRoomData *rd; PTData *ptd;

	gc  = gaim_conversation_get_gc(c);
	rd  = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	ptd = rd->ptd;

	if (!i_am_owner(rd,FALSE)) {
		*error = g_strdup(_("This command can only be used the room's owner."));
		return GAIM_CMD_RET_FAILED;
	}

	pt_send_packet(gc->proto_data,PACKET_ROOM_CLOSE,rd->id);
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_toggle_reddot_effect(GaimConversation *c, const char *cmd, char **args, 
				          char **error, void *data)
{
	GaimConnection *gc; PTRoomData *rd; PTData *ptd; GString *out; int e = 0;

	gc  = gaim_conversation_get_gc(c);
	rd  = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	ptd = gc->proto_data;
	
	if (!rd->admin) {
		*error = g_strdup(_("You are not an admin in this room."));
		return GAIM_CMD_RET_FAILED;
	}

	if (!strcmp(args[0],"video")) e = 1;
	if (!strcmp(args[0],"text"))  e = 2;
	
	switch (e) {
		case 0:
			*error = g_strdup(_("You must specify one of 'video', or 'text'."));
			return GAIM_CMD_RET_FAILED;
		break;
		case 1: 
			pt_send_packet(ptd,PACKET_ROOM_RED_DOT_VIDEO,rd->id,rd->video ? 0 : 1); 
			rd->video = FALSE;
		break;
		case 2: 
			pt_send_packet(ptd,PACKET_ROOM_RED_DOT_TEXT,rd->id,rd->text ? 0 : 1);  
			rd->text = FALSE;
		break;
	}

	out = g_string_new(_("reddot is currently affecting: [ Voice "));
	if (rd->text)	g_string_append_printf(out,"%s ",_("Text "));
	if (rd->video)	g_string_append_printf(out,"%s ",_("Video "));
	g_string_append(out,_("] privileges"));
	
	gaim_conversation_write(c,NULL,out->str,GAIM_MESSAGE_NO_LOG,time(NULL));
	g_string_free(out,TRUE);
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_show_reddot_effect(GaimConversation *c, const char *cmd, char **args, 
				          char **error, void *data)
{
	GaimConnection *gc; PTRoomData *rd; GString *out;

	gc  = gaim_conversation_get_gc(c);
	rd  = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	
	if (!rd->admin) {
		*error = g_strdup(_("You are not an admin in this room."));
		return GAIM_CMD_RET_FAILED;
	}

	out = g_string_new(_("reddot is currently affecting: [ Voice "));
	if (rd->text)	g_string_append_printf(out,"%s ",_("Text "));
	if (rd->video)	g_string_append_printf(out,"%s ",_("Video "));
	g_string_append(out,_("] privileges"));
	
	gaim_conversation_write(c,NULL,out->str,GAIM_MESSAGE_NO_LOG,time(NULL));
	g_string_free(out,TRUE);
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_cmd_micon(GaimConversation *c, const char *cmd, char **args, char **error, 
		                void *data)
{
	GaimConnection *gc; PTRoomData *rd; PTData *ptd; int i;

	gc  = gaim_conversation_get_gc(c);
	rd  = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	ptd = rd->ptd;

	i = gaim_media_stream_get_status(rd->stream);
	if (rd->stream && !(i & GAIM_MEDIA_STREAM_STATUS_PAUSED)) {
		rd->stream->do_write = TRUE;
		gaim_media_stream_start_write(rd->stream);
	}
	
	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_cmd_micoff(GaimConversation *c, const char *cmd, char **args, char **error, 
		                void *data)
{
	GaimConnection *gc; PTRoomData *rd; PTData *ptd;

	gc  = gaim_conversation_get_gc(c);
	rd  = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	ptd = rd->ptd;

	if (rd->stream && rd->stream->do_write) {
		rd->stream->do_write = FALSE;
		g_thread_join(rd->stream->w_thread);
		rd->stream->w_thread = NULL;
	}

	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_cmd_mute(GaimConversation *c, const char *cmd, char **args, char **error, 
		                void *data)
{
	GaimConnection *gc; PTRoomData *rd; PTData *ptd; 

	gc  = gaim_conversation_get_gc(c);
	rd  = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	ptd = rd->ptd; 

	gaim_media_stream_pause(rd->stream);

	return GAIM_CMD_RET_OK;
}

static GaimCmdRet pt_cmd_reqmic(GaimConversation *c, const char *cmd, char **args, char **error, 
		                void *data)
{
	GaimConnection *gc; PTRoomData *rd; PTData *ptd; 

	gc  = gaim_conversation_get_gc(c);
	rd  = pt_get_room_data(gc->proto_data,GAIM_CONV_CHAT(c)->id); 
	ptd = rd->ptd;

	if (rd->stream->ops.req_mic) rd->stream->ops.req_mic(rd->stream);
	return GAIM_CMD_RET_OK;
}


void pt_register_commands() 
{
	gaim_cmd_register("w","S",GAIM_CMD_P_PRPL, 
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_whisper,
			  _("w &lt;nickname&gt;: &lt;message&gt;: Whisper to a user in a room."),
			  NULL);
	
	gaim_cmd_register("msg","S",GAIM_CMD_P_PRPL, 
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_whisper,
			  _("msg &lt;nickname&gt;: &lt;message&gt;: Whisper to a user in a room."),
			  NULL);

	gaim_cmd_register("ban","S",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_ban,
			  _("ban [nickname | 'all']: Ban a user from a room."),
			  (gpointer)TRUE);

	gaim_cmd_register("unban","S",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_ban,
			  _("unban [nickname | 'all']: Unban a user from a room."),
			  (gpointer)FALSE);

	gaim_cmd_register("bounce","S",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_bounce,
			  _("bounce &lt;nickname&gt;: Bounce a user from a chat."),(gpointer)TRUE);

	gaim_cmd_register("unbounce","S",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_bounce,
			  _("unbounce &lt;nickname&gt;: Remove a bounce on a user in a chat."),
			  (gpointer)FALSE);

	gaim_cmd_register("removemic","",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_mode_m,
			  _("removemic: User's can't use the mic unless you explicitly allow it. "
			    "This is similar to a /mode +m in IRC."),
			  (gpointer)FALSE);

	gaim_cmd_register("restoremic","",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_mode_m,
			  _("restoremic: User's can use this mic freely. This is similar to a "
		            "/mode -m in IRC."),
			  (gpointer)TRUE);
	
	gaim_cmd_register("clearhands","",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_clear_hands,
			  _("clearhands: Remove all mic requests. "),
		          NULL);

	gaim_cmd_register("reddot","S",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_red_dot,
			  _("reddot [nickname | 'all']: Take away a user's privileges."),
			  (gpointer)TRUE);

	gaim_cmd_register("unreddot","S",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_red_dot,
			  _("unreddot [nickname | 'all']: Restore a user's privileges."),
			  (gpointer)FALSE);

	gaim_cmd_register("re","s",GAIM_CMD_P_PRPL,
			  GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_toggle_reddot_effect,
			  _("reddoteffect ['text' | 'video']: Toggle wether or not a 'reddot' "
		            "command effects a certain priviledge. A 'reddot' can effect both "
			    "privileges simultaniously, and always effects voice priviliges."),
			  NULL);

	gaim_cmd_register("sre","",GAIM_CMD_P_PRPL,
			  GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_show_reddot_effect,
			  _("showreddoteffect: Show which priviledges a 'reddot' command "
			    "effects. A 'reddot' can effect video, voice, and text privileges "
			    "simultaniously and always effects voice priviliges."),
			  NULL);

	gaim_cmd_register("listbans","",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_listbans,
			  _("listbans: List all users banned from the room."),
			  (gpointer)TRUE);

	gaim_cmd_register("listbounces","",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_listbans,
			  _("listbounces: List all users bounced from the room."),
			  (gpointer)FALSE);

	gaim_cmd_register("close","",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_close_room,
			  _("close: Close the room."),
			  NULL);

	gaim_cmd_register("micon","",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_cmd_micon,
			  _("micon: Begin talking in a room."),
			  (gpointer)FALSE);

	gaim_cmd_register("micoff","",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_cmd_micoff,
			  _("micoff: Stop talking in a room."),
			  (gpointer)FALSE);

	gaim_cmd_register("mute","",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_cmd_mute,
			  _("mute: Mute the room."),
			  (gpointer)FALSE);

	gaim_cmd_register("reqmic","",GAIM_CMD_P_PRPL,
		          GAIM_CMD_FLAG_CHAT | GAIM_CMD_FLAG_PRPL_ONLY,
			  "prpl-paltalk",pt_cmd_reqmic,
			  _("reqmic: Request the mic (Raise the hand.)"),
			  (gpointer)FALSE);


}

