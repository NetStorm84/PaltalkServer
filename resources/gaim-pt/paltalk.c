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
#include "prpl.h"
#include "notify.h"
#include "version.h"
#include "util.h"

/*	Callbacks		*/
void pt_login_callback(gpointer data, gint source, GaimInputCondition cond) 
{
	GaimConnection *gc    = data;
	PTData         *pdata = gc->proto_data;

	if (gc->inpa) gaim_input_remove(gc->inpa);
	
	if (!pdata || source < 0) {
		gaim_connection_error(gc,_("Connection failed"));
		return;
	}

	pdata->fd = source;

	/* Let's Git 'R Done! */
	gc->inpa = gaim_input_add(pdata->fd,GAIM_INPUT_READ,pt_callback,gc);
}

static void pt_location_url_callback(void *data, const char *html, size_t size)
{
	GaimConnection *gc = data; char *t,*t2;
	
	if (!(t = strchr(html,':'))) return;
	*t = 0; t++;
	if (!(t2 = strchr(t,':')))   return;
	*t2 = 0; t2++;

	if (gaim_proxy_connect(gc->account,t,atoi(t2),pt_login_callback,gc)) {
		gaim_connection_error(gc, _("Unable to connect."));
		return;
	}
}

/* TODO: Optimize this */
static void pt_profile_url_callback(void *ptd, const char *html, size_t size) 
{
	PTData *data = ptd; char *tmp,*k,*d,*t2,*nick=NULL,**tokens; int i;

	/* Strip the HTML and fixup the beginning (mostly whitespace/&nbsp;'s) */
	tmp = gaim_markup_strip_html(html);
	k   = strchr(tmp,':'); k--;
	while(g_ascii_isalnum(*k)) k--;	/* k should be the start of the first token. */
	k = g_strchomp(k);	

	if (!strncasecmp(k,"Error occured: Palinfo not",26)) {
		tmp  = g_strdup(_("<b>Error:</b> Unable to fetch profile data!\n"));
		nick = strstr(k,"nick: ");
		if (nick) {
			t2 = strchr(nick,'\n');
			if (t2) { 
				*t2 = 0; t2++;
				nick = g_strdup(g_strstrip(nick+6));
			}
		}
	} else {
		tokens = g_strsplit(k,"\n",-1); tmp = NULL;
		for (i=0;tokens[i];i++) {
			if ((d = strchr(tokens[i],':'))) {
				*d = 0; d++;
				k = g_strstrip(tokens[i]); d = g_strstrip(d);
				k = g_convert(k,strlen(k),"UTF-8","ISO-8859-1",NULL,NULL,NULL);
				d = g_convert(d,strlen(d),"UTF-8","ISO-8859-1",NULL,NULL,NULL);
				if (!strcasecmp(k,"Nickname") && !nick) nick = g_strdup(d);
				t2  = tmp;
				if (t2) {
					tmp = g_strdup_printf("%s<b>%s</b>:  %s<br>\n",t2,k,d);
					g_free(t2);
				} else  tmp = g_strdup_printf("<b>%s</b>:  %s<br>\n",k,d);
				g_free(k); g_free(d);
			}
		}
		g_strfreev(tokens);
	}
	
	if (!nick) return;
	t2 = g_strdup_printf(_("Info for %s"),nick);
	gaim_notify_userinfo(gaim_account_get_connection(data->a),nick,t2,_("Buddy Information"),
			     NULL,tmp,NULL,NULL);
	g_free(t2); g_free(nick);
}

/*	Prpl Functions		*/
static const char *pt_list_icon(GaimAccount *a, GaimBuddy *b) 
{  
	return "paltalk"; 
}

static void pt_list_emblems(GaimBuddy *b, char **se, char **sw, char **nw, char **ne) 
{
	if (!GAIM_BUDDY_IS_ONLINE(b)) *se = "offline";
	else if (b->uc & 0x02)        *se = "away";
	else if (b->uc & 0x04)        *se = "invisible";
	else if (b->uc & 0x08)        *se = "dnd";
	else if (b->uc & 0x10)	      *se = "offline";
}

static char *pt_status_text(GaimBuddy *b) 
{
	if (!GAIM_BUDDY_IS_ONLINE(b)) return SSTATUS_OFFLINE;
	if (b->uc & 0x01)             return SSTATUS_ONLINE;
	if (b->uc & 0x02)             return SSTATUS_AWAY;
	if (b->uc & 0x04)             return SSTATUS_INVISIBLE;
	if (b->uc & 0x08)             return SSTATUS_DND;
	if (b->uc & 0x10)	      return SSTATUS_OFFLINE;
	return _("Unknown");
}

static GList *pt_away_states(GaimConnection *gc) 
{
	GList *types = NULL;
	types = g_list_append(types,SSTATUS_ONLINE);
	types = g_list_append(types,SSTATUS_AWAY);
	types = g_list_append(types,SSTATUS_DND);
	types = g_list_append(types,SSTATUS_INVISIBLE);
	types = g_list_append(types,SSTATUS_OFFLINE);
	types = g_list_append(types,GAIM_AWAY_CUSTOM);
	return types;
}

static void pt_login(GaimAccount *account) 
{
	PTData *data;
	GaimConnection *gc = gaim_account_get_connection(account); const char *username,*nickname;
	
	gc->proto_data = data = g_new0(PTData,1);
	gc->flags      = GAIM_CONNECTION_HTML      | GAIM_CONNECTION_NO_BGCOLOR | 
			 GAIM_CONNECTION_AUTO_RESP | GAIM_CONNECTION_NO_IMAGES;
	data->a        = account;
	username       = gaim_account_get_username(account);
	
	if (username && atol(username) > 0) { /* Username is a UIN */
		data->uin = atol(username);
		nickname  = gaim_account_get_string(account,"nickname","");
		gaim_connection_set_display_name(gc,nickname);
	}

	gaim_connection_update_progress(gc, _("Connecting to Paltalk Server"), 1, 5);
	gaim_url_fetch("http://paltalk.com/location2.txt",TRUE,
		       "Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0)",TRUE,
		       pt_location_url_callback,gc);
}

static void pt_close(GaimConnection *gc) 
{
	PTData *data = gc->proto_data; GList *tmp; PTCategory *cat; PTIm *im;
	
	if (gc->inpa)        gaim_input_remove(gc->inpa);
	if (data->serverkey) g_free(data->serverkey);
	if (data->fd > 0)    close(data->fd);

	for (tmp=data->xfers;tmp && tmp->data;tmp=tmp->next) 
		if (tmp->data) pt_xfer_destroy(tmp->data);

	for (tmp=data->chats;tmp && tmp->data;tmp=tmp->next)
		if (tmp->data) pt_room_data_destroy(data,tmp->data);
		
	for (tmp=data->categories;tmp && tmp->data;tmp=tmp->next) {
		cat              = tmp->data;
		data->categories = g_list_remove(data->categories,tmp->data);
		g_free(cat->name);
		g_free(cat);
	}

	for (tmp=data->ims;tmp;tmp=tmp->next) {
		if ((im = tmp->data)) {
			if (im->uin)  g_free(im->uin);
			if (im->nick) g_free(im->uin);
			data->ims = g_list_remove(data->ims,im);
		}
	}
	
	g_free(data);	
}

static int pt_send_im(GaimConnection *gc, const char *who, const char *what, GaimConvImFlags flags) 
{
	char *msg,*buf = (char *)what, *q = who;

	if (flags & GAIM_CONV_IM_AUTO_RESP) 
		buf = g_strdup_printf("<font color=\"#0\">[Auto-Response] </font>%s",what);
	msg = pt_convert_from_html(buf);

	if (!g_ascii_isdigit(*who)) q = pt_get_cb_real_name(gc,-1,who);
	pt_send_packet(gc->proto_data,PACKET_IM_OUT,msg,atol(q));
	g_free(msg);
	if (q != who) g_free(q);
	return 1;
}

static void pt_get_info(GaimConnection *gc, const char *who)
{ 
	char *url, *nick = (char *)who;

	if (g_ascii_isdigit(*who)) nick = pt_get_cb_real_name(gc,-1,who);

	url = g_strdup_printf(
		"http://service.paltalk.com/web/ControllerServlet?RequestId=Web.PalInfo&nick=%s"
		"&mynick=%s&psts=N",
		gaim_url_encode(nick),gaim_url_encode(gaim_account_get_alias(gc->account)));
	
	gaim_url_fetch(url,TRUE,"Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0)",TRUE,
		       pt_profile_url_callback,gc->proto_data);

	if (nick != who) g_free(nick);
	g_free(url);
}

static void pt_set_away(GaimConnection *gc, const char *state, const char *msg) 
{
	PTData *data = gc->proto_data;
	
	if (gc->away) {
		g_free(gc->away);
		gc->away = NULL;
	}

	if (!strcmp(state,SSTATUS_OFFLINE)) {
		gaim_account_disconnect(data->a);
		return;
	}

	if (!strcmp(state,SSTATUS_ONLINE))    data->status = STATUS_ONLINE;
	if (!strcmp(state,SSTATUS_INVISIBLE)) data->status = STATUS_INVISIBLE;
	if (!strcmp(state,SSTATUS_AWAY) || (!strcmp(state,GAIM_AWAY_CUSTOM) && msg)) {
		data->status = STATUS_AWAY;
		gc->away = g_strdup(msg);
	}
	if (!strcmp(state,SSTATUS_DND)) {
		data->status = STATUS_DND;
		gc->away = g_strdup(msg);
	}
	if (!strcmp(state,GAIM_AWAY_CUSTOM) && !msg) data->status = STATUS_ONLINE;
	
	pt_send_packet(data,PACKET_CHANGE_STATUS,data->status);
}

static void pt_add_buddy(GaimConnection *gc, GaimBuddy *buddy, GaimGroup *group) 
{
	if (gc->state != GAIM_CONNECTED) return;
	if (!g_ascii_isdigit(*buddy->name)) {
		buddy->server_alias = buddy->name;
		buddy->name         = pt_get_cb_real_name(gc,-1,buddy->name);
	}
	pt_send_packet(gc->proto_data,PACKET_ADD_BUDDY,atol(buddy->name));
}

static void pt_remove_buddy(GaimConnection *gc, GaimBuddy *buddy, GaimGroup *group) 
{
	if (gc->state != GAIM_CONNECTED) return;
	if (!g_ascii_isdigit(*buddy->name)) {
		buddy->server_alias = buddy->name;
		buddy->name         = pt_get_cb_real_name(gc,-1,buddy->name);
	}
	pt_send_packet(gc->proto_data,PACKET_REMOVE_BUDDY,atol(buddy->name));
}

static void pt_add_deny(GaimConnection *gc, const char *who) 
{
	if (gc->state != GAIM_CONNECTED) return;
	pt_send_packet(gc->proto_data,PACKET_BLOCK_BUDDY,atol(who));
}

static void pt_rem_deny(GaimConnection *gc, const char *who) 
{
	if (gc->state != GAIM_CONNECTED) return;
	pt_send_packet(gc->proto_data,PACKET_UNBLOCK_BUDDY,atol(who));
}

static void pt_set_permit_deny(GaimConnection *gc) 
{ 
	gc->account->perm_deny = 4; 
}

static void pt_convo_closed(GaimConnection *gc, const char *who) 
{ 
	GList *tmp; PTIm *im; PTData *data = gc->proto_data;
	for (tmp=data->ims;tmp;tmp=tmp->next) {
		if (tmp->data) {
			im = tmp->data;
			if (im && (!strcmp(im->nick,who) || !strcmp(im->uin,who))) {
				g_free(im->nick);
				g_free(im->uin);
				data->ims = g_list_remove(data->ims,im);
				g_free(im);
			}
		}
	}
}

/* This is needed to prevent a really bad segfault. */
static void pt_add_buddies(GaimConnection *gc, GList *buddies, GList *groups)
{
	return;
}

static GaimPluginProtocolInfo prpl_info =
{
	OPT_PROTO_CHAT_TOPIC,
	NULL,					/* user_splits */
	NULL,					/* protocol_options */
	NO_BUDDY_ICONS,			        /* icon_spec */
	pt_list_icon,			        /* list_icon */
	pt_list_emblems,		        /* list_emblems */
	pt_status_text,				/* status_text */
	NULL, 					/* tooltip_text */
	pt_away_states,			        /* away_states */
	pt_blist_node_menu,			/* blist_node_menu */
	NULL,				        /* chat_info */
	NULL,                                   /* chat_info_defaults */
	pt_login,				/* login */
	pt_close,				/* close */
	pt_send_im,			        /* send_im */
	NULL,					/* set_info */
	NULL,					/* send_typing */
	pt_get_info,			        /* get_info */
	pt_set_away,				/* set_away */
	NULL,					/* set_idle */
	NULL,					/* change_passwd */
	pt_add_buddy,			        /* add_buddy */
	pt_add_buddies,				/* add_buddies */
	pt_remove_buddy,			/* remove_buddy */
	NULL,					/* remove_buddies */
	NULL,					/* add_permit */
	pt_add_deny,				/* add_deny */
	NULL,					/* rem_permit */
	pt_rem_deny,				/* rem_deny */
	pt_set_permit_deny,			/* set_permit_deny */
	NULL,					/* warn */
	pt_chat_join,			        /* join_chat */
	NULL,					/* reject chat invite */
	pt_get_chat_name,		        /* get_chat_name */
	pt_chat_invite,				/* chat_invite */
	pt_chat_leave,			        /* chat_leave */
	NULL,					/* chat_whisper */
	pt_chat_send,				/* chat_send */
	NULL,					/* keepalive */
	NULL,					/* register_user */
	NULL,					/* get_cb_info */
	NULL,					/* get_cb_away */
	NULL,					/* alias_buddy */
	NULL,					/* group_buddy */
	NULL,					/* rename_group */
	NULL,					/* buddy_free */
	pt_convo_closed,			/* convo_closed */
	NULL,					/* normalize */
	NULL,					/* set_buddy_icon */
	NULL,					/* remove_group */
	pt_get_cb_real_name,			/* get_cb_real_name */
	pt_set_chat_topic,			/* set_chat_topic */
	NULL,					/* find_blist_chat */
	pt_roomlist_get,			/* roomlist_get_list */
	pt_roomlist_cancel,			/* roomlist_cancel */
	pt_roomlist_expand_category,		/* roomlist_expand_category */
	pt_can_receive_file,			/* can_receive_file */
	pt_send_file				/* send_file */
};

static GaimPluginInfo info =
{
	GAIM_PLUGIN_MAGIC,
	GAIM_MAJOR_VERSION,
	GAIM_MINOR_VERSION,
	GAIM_PLUGIN_PROTOCOL,                             /**< type           */
	NULL,                                             /**< ui_requirement */
	0,                                                /**< flags          */
	NULL,                                             /**< dependencies   */
	GAIM_PRIORITY_DEFAULT,                            /**< priority       */
	"prpl-paltalk",                                   /**< id             */
	"Paltalk",                                        /**< name           */
	VERSION,                                          /**< version        */
	N_("Paltalk Protocol Plugin"),                    /**  summary        */
	N_("Paltalk Protocol Plugin"),                    /**  description    */
	"Tim Hentenaar <tim@hentsoft.com>", 		  /**< author         */
	"http://xodian.net/code.php",                     /**< homepage       */
	NULL,                                             /**< load           */
	NULL,                                             /**< unload         */
	NULL,                                             /**< destroy        */
	NULL,                                             /**< ui_info        */
	&prpl_info,                                       /**< extra_info     */
	NULL,
	pt_actions
};

static void init_plugin(GaimPlugin *plugin) 
{
	pt_register_commands();
	return;
}

GAIM_INIT_PLUGIN(paltalk,init_plugin,info)






