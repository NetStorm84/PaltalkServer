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
#include "plugin.h"
#include "connection.h"
#include "notify.h"
#include "request.h"

/*		Protocol Actions		*/

static void pt_got_admin_code(GaimConnection *gc, const char *code) 
{
	if (!code) return;
	pt_send_packet(gc->proto_data,PACKET_ROOM_JOIN_AS_ADMIN,atol(code));
}

/* TODO: Optimize this */
void pt_parse_search_results(GaimConnection *gc, char *packet) 
{
	GString *out; char **tokens,**tokens2,*t; int i,j;
	
	if (PACKET_GET_LENGTH(packet) == 0) return;
	
	out    = g_string_new("");
	tokens = g_strsplit(packet,BSEP,-1);
	for (i=0;tokens[i] && *tokens[i];i++) {	
		tokens2 = g_strsplit(tokens[i],FSEP,-1);
		for (j=0;tokens2[j] && *tokens2[j];j++) {
			if ((t = strchr(tokens2[j],'='))) {
				*t = 0; t++; 
				if (!strcmp(tokens2[j],"uid"))
					g_string_append_printf(out,"<b>%s</b>: %s<br>",
							       _("Screen Name"),t);
				if (!strcmp(tokens2[j],"first")  && *t != '*') 
					g_string_append_printf(out,"<b>%s</b>: %s<br>",
							       _("First Name"),t);
				if (!strcmp(tokens2[j],"last") && *t != '*') 
					g_string_append_printf(out,"<b>%s</b>: %s<br>",
							       _("Last Name"),t);
				if (!strcmp(tokens2[j],"nickname"))
					g_string_append_printf(out,"<b>%s</b>: %s<br>",
							       _("Nickname"),t);
				if (!strcmp(tokens2[j],"email") && *t != '*')
					g_string_append_printf(out,"<b>%s</b>: %s<br>",
							       _("E-Mail Address"),t);
			}	
		}
		g_string_append(out,"<hr><br>");
		g_strfreev(tokens2);
	}
	g_strfreev(tokens);
	
	gaim_notify_formatted(gc,NULL,_("Search Results"),
		_("Your search produced the following results:"),out->str,NULL,NULL);

	g_string_free(out,TRUE);
}

static void pt_do_search(GaimConnection *gc, const char *example) 
{
	char *tmp;

	if (strchr(example,'@')) tmp = g_strdup_printf("email=%s",example);
	else                     tmp = g_strdup_printf("nickname=%s",example);

	/* Perform the search */
	pt_send_packet(gc->proto_data,PACKET_DO_SEARCH,tmp);

	g_free(tmp);
}

static void pt_search_dir(GaimPluginAction *action) 
{
	GaimConnection *gc = (GaimConnection *)action->context;
	gaim_request_input(gc,_("Find Buddy"),_("Search for a buddy by nickname or e-mail address"),
		      _("Type the e-mail address or nickname of the buddy you are searching for."),
		      NULL,FALSE,FALSE,NULL,
		      _("Search"),G_CALLBACK(pt_do_search),
		      _("Cancel"),NULL,gc);
}

static void pt_create_my_room(GaimPluginAction *action) 
{
	GaimConnection *gc = (GaimConnection *)action->context;

	pt_send_packet(gc->proto_data,PACKET_GET_SERVICE_URL,SERVICE_URL_CREATE_ROOM);
}

static void pt_changepass(GaimPluginAction *action) 
{
	GaimConnection *gc = (GaimConnection *)action->context;

	pt_send_packet(gc->proto_data,PACKET_GET_SERVICE_URL,SERVICE_URL_CHANGE_PASSWORD);
}

static void pt_set_info(GaimPluginAction *action) 
{
	GaimConnection *gc = (GaimConnection *)action->context;

	pt_send_packet(gc->proto_data,PACKET_GET_SERVICE_URL,SERVICE_URL_SET_USER_INFO);
}

static void pt_join_my_room(GaimPluginAction *action) 
{
	GaimConnection *gc; PTData *data;

	gc   = (GaimConnection *)action->context;
	data = gc->proto_data; data->owner = data->uin;

	gaim_request_input(gc,_("Join Room as Admin"),_("Join a chat room as an Admin"),
		           _("Type the Admin code to enter the room."),
		           NULL,FALSE,FALSE,NULL,
		           _("Go"),G_CALLBACK(pt_got_admin_code),
		           _("Cancel"),NULL,gc);
}

GList *pt_actions(GaimPlugin *plugin, gpointer context) 
{
	GList *m = NULL; GaimPluginAction *act;

	act = gaim_plugin_action_new(_("Set User Info (URL)..."),pt_set_info);
	m   = g_list_append(m,act);

	act = gaim_plugin_action_new(_("Change Password (URL)..."),pt_changepass);
	m   = g_list_append(m,act);

	act = gaim_plugin_action_new(_("Create / Edit your Room (URL)..."),pt_create_my_room);
	m   = g_list_append(m,act);

	act = gaim_plugin_action_new(_("Join your Room"),pt_join_my_room);
	m   = g_list_append(m,act);

	m   = g_list_append(m,NULL);
	
	act = gaim_plugin_action_new(_("Search for Buddy"),pt_search_dir);
	m   = g_list_append(m,act);
	
	return m;
}

/*		Buddy List Menu Actions		*/

static void pt_private_room_cb(GaimBlistNode *node, gpointer d) 
{
	GaimConnection *gc;
	
	if (!node || !GAIM_BLIST_NODE_IS_BUDDY(node)) return;

	gc = gaim_account_get_connection(((GaimBuddy *)node)->account);
	pt_send_packet(gc->proto_data,PACKET_ROOM_PRIVATE_INVITE,atol(((GaimBuddy *)node)->name));
}

static void pt_admin_room_cb(GaimBlistNode *node, gpointer d) 
{
	GaimConnection *gc; PTData *data;
	
	if (!node || !GAIM_BLIST_NODE_IS_BUDDY(node)) return;

	gc   = gaim_account_get_connection(((GaimBuddy *)node)->account);
	data = gc->proto_data; data->owner = atol(((GaimBuddy *)node)->name);

	gaim_request_input(gc,_("Join Room as Admin"),_("Join a chat room as an Admin"),
		           _("Type the Admin code to enter the room."),
		           NULL,FALSE,FALSE,NULL,
		           _("Go"),G_CALLBACK(pt_got_admin_code),
		           _("Cancel"),NULL,gc);
}

GList *pt_blist_node_menu(GaimBlistNode *node) 
{
	GList *m = NULL; GaimBlistNodeAction *act; 
	
	if (!node || !GAIM_BLIST_NODE_IS_BUDDY(node)) return NULL;

	act = gaim_blist_node_action_new(_("Invite this user to a _Private Room"),
					 pt_private_room_cb,NULL);
	m   = g_list_append(m,act);

	act = gaim_blist_node_action_new(_("_Join this user's room as an Admin"),
					 pt_admin_room_cb,NULL);
	m   = g_list_append(m,act);
	
	return m;
}

