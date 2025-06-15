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
#include "conversation.h"
#include "server.h"
#include "request.h"
#include "eventloop.h"
#include "mediastream.h"
#include "debug.h"

static void pt_lockword_callback(PTData *ptd, const char *passwd)
{
	if (!passwd) return;
	pt_send_packet(ptd,PACKET_ROOM_JOIN,TRUE,ptd->locked,passwd);
}

char *pt_get_chat_name(GHashTable *data) 
{
	return g_strdup(g_hash_table_lookup(data, "nm"));
}

void pt_chat_invite(GaimConnection *gc, int id, const char *message, const char *who) 
{
	char *q = who;
	if (!g_ascii_isdigit(*who)) q = pt_get_cb_real_name(gc,id,who); 
	pt_send_packet(gc->proto_data,PACKET_ROOM_INVITE_OUT,id,atol(q));
	if (q != who) g_free(q);
}

void pt_set_chat_topic(GaimConnection *gc, int id, const char *topic) 
{
	PTRoomData *rd = pt_get_room_data(gc->proto_data,id);
	if (!rd->admin) return;

	pt_send_packet(gc->proto_data,PACKET_ROOM_SET_TOPIC,topic,id);
}

void pt_chat_join(GaimConnection *gc, GHashTable *data) 
{
	PTData *ptd = gc->proto_data; long id; char *ctmp;
	
	if (!data) return;
	if ((ctmp = g_hash_table_lookup(data,"group_id"))) 
		id = atol(ctmp);
	else    id = atol(g_hash_table_lookup(data,"id"));
	if (id > 0) {
		if (g_hash_table_lookup(data,"l")) {		
			ptd->locked = id;
			gaim_request_input(gc,_("Locked Room"),_("This room is locked."),
		           		   _("Type the lockword to enter the room."),
				           NULL,FALSE,FALSE,NULL,
				           _("Go"),G_CALLBACK(pt_lockword_callback),
		           		   _("Cancel"),NULL,ptd);
		} else pt_send_packet(ptd,PACKET_ROOM_JOIN,FALSE,id);
	}
}

void pt_chat_leave(GaimConnection *gc, int id) 
{
	PTRoomData *rd = pt_get_room_data(gc->proto_data,id);
	
	gaim_media_stream_cancel_local(rd->stream);
	pt_send_packet(gc->proto_data,PACKET_ROOM_LEAVE,id);
	serv_got_chat_left(gc,id);
	pt_room_data_destroy(gc->proto_data,pt_get_room_data(gc->proto_data,id));
}

int pt_chat_send(GaimConnection *gc, int id, const char *what) 
{
	GaimConversation *c = gaim_find_chat(gc,id); char *tmp; char **tokens; int i;
	
	if (strchr(what,'\n')) {
		tokens = g_strsplit(what,"\n",-1);
	
		for (i=0;tokens[i] && *tokens[i];i++) {
			if (!strstr(what,"/w ")) 
				serv_got_chat_in(gc,id,gaim_account_get_alias(c->account),0,
						 tokens[i],time(NULL));		
			tmp = pt_convert_from_html(tokens[i]);
			pt_send_packet(gc->proto_data,PACKET_ROOM_MESSAGE_OUT,tmp,id);
			g_free(tmp);
		}
		return 1;
	}
	
	if (strstr(what,"<br>")) {
		tokens = g_strsplit(what,"<br>",-1);
	
		for (i=0;tokens[i] && *tokens[i];i++) {
			if (!strstr(what,"/w ")) 
				serv_got_chat_in(gc,id,gaim_account_get_alias(c->account),0,
						 tokens[i],time(NULL));		
			tmp = pt_convert_from_html(tokens[i]);
			pt_send_packet(gc->proto_data,PACKET_ROOM_MESSAGE_OUT,tmp,id);
			g_free(tmp);
		}
		return 1;
	}

	tmp = pt_convert_from_html((gpointer)what);
	pt_send_packet(gc->proto_data,PACKET_ROOM_MESSAGE_OUT,tmp,id);
	serv_got_chat_in(gc,id,gaim_account_get_alias(c->account),0,what,time(NULL));
	g_free(tmp);
	return 1;
}

PTRoomData *pt_get_room_data(PTData *data, int id)
{
	GList *tmp; PTRoomData *rd = NULL;

	for (tmp=data->chats;tmp;tmp=tmp->next) {
		if (tmp->data && ((PTRoomData *)tmp->data)->id == id) {
			rd = tmp->data;
			break;
		}
	}
	
	return rd;
}

char *pt_get_cb_real_name(GaimConnection *gc, int id, const char *who)
{
	PTData *data  = gc->proto_data; PTRoomData *rd; GList *tmp,*tmp2;
	GHashTable *htmp = NULL; GaimBuddy *b; int isNick = 0, i;
	
	if (!who) return NULL;
	for (i=0;i<strlen(who);i++) if (g_ascii_isalpha(who[i])) isNick = 1;
	if (isNick == 0 || (*who == '-' && g_ascii_isdigit(*(who+1)))) {
		/* We're looking for a nickname */
		if (atol(who) == -2 || atol(who) == 0)   return g_strdup(_("Paltalk"));
		if (atol(who) == 28)                     return g_strdup(_("Paltalk Notifier"));
		if ((b  = gaim_find_buddy(data->a,who))) return g_strdup(b->server_alias);
		if (id == -1) {
			for (tmp=data->chats;tmp;tmp=tmp->next) {
				for (tmp2=((PTRoomData *)(tmp->data))->users;tmp2;tmp2=tmp2->next) {
					htmp = tmp2->data;
					if (!strcmp(g_hash_table_lookup(htmp,"uid"),who))
					      return g_strdup(g_hash_table_lookup(htmp,"nickname"));
				}
			}
			for (tmp=data->ims;tmp;tmp=tmp->next) 
				if (tmp->data && ((PTIm *)(tmp->data))->uin && 
				    !strcmp(((PTIm *)(tmp->data))->uin,who)) 
					return g_strdup(((PTIm *)(tmp->data))->nick);
		} else if ((rd = pt_get_room_data(data,id))) {
			for (tmp=rd->users;tmp;tmp=tmp->next) {
				htmp = tmp->data;
				if (!strcmp(g_hash_table_lookup(htmp,"uid"),who))
					return g_strdup(g_hash_table_lookup(htmp,"nickname"));
			}
		}
	} else {			/* We're looking up a UIN 	*/
		if (id == -1) {
			for (tmp=data->ims;tmp;tmp=tmp->next) 
				if (tmp->data && ((PTIm *)(tmp->data))->nick && 
				    !strcmp(((PTIm *)(tmp->data))->nick,who)) 
					return g_strdup(((PTIm *)(tmp->data))->uin);
			for (tmp=data->chats;tmp;tmp=tmp->next) {
				for (tmp2=((PTRoomData *)(tmp->data))->users;tmp2;tmp2=tmp2->next) {
					htmp = tmp2->data;
					if (!strcmp(g_hash_table_lookup(htmp,"nickname"),who))
						return g_strdup(g_hash_table_lookup(htmp,"uid"));
				}
			}
		} else if ((rd = pt_get_room_data(data,id))) {
			for (tmp=rd->users;tmp;tmp=tmp->next) {
				htmp = tmp->data;
				if (!strcmp(g_hash_table_lookup(htmp,"nickname"),who))
					return g_strdup(g_hash_table_lookup(htmp,"uid"));
			}
		} 
	}
	return g_strdup(who);
}

void pt_room_data_destroy(PTData *data, PTRoomData *rd)
{
	GList *tmp; 
	
	if (!rd) return;

	data->chats = g_list_remove(data->chats,rd);
	
	if (rd->topic) g_free(rd->topic);
	
	for (tmp=rd->bounce;tmp && tmp->data;tmp=tmp->next) {
		g_free(tmp->data);
		rd->bounce = g_list_remove(rd->bounce,tmp->data);
	}
	
	for (tmp=rd->ban;tmp && tmp->data;tmp=tmp->next) {
		g_free(tmp->data);
		rd->ban = g_list_remove(rd->ban,tmp->data);
	}
	
	for (tmp=rd->users;tmp && tmp->data;tmp=tmp->next) {
		g_hash_table_destroy(tmp->data);
		rd->users = g_list_remove(rd->users,tmp->data);
	}

	if (rd->speaker) g_free(rd->speaker);	
	if (rd->stream)  pt_media_stream_destroy(rd->stream);
	g_free(rd);
}
