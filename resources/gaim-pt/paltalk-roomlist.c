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
#include "roomlist.h"
#include "util.h"

GaimRoomlist *pt_roomlist_get(GaimConnection *gc) 
{
	PTData *data = gc->proto_data; GList *ltmp = NULL; GList *stmp;
	GaimRoomlistField *rftmp; PTCategory *cat; 
	
	if (data->roomlist) gaim_roomlist_unref(data->roomlist);
	data->roomlist = gaim_roomlist_new(gaim_connection_get_account(gc));

	/* Add the roomlist fields */
	rftmp = gaim_roomlist_field_new(GAIM_ROOMLIST_FIELD_INT,"id","id",TRUE);
	ltmp  = g_list_append(ltmp,rftmp);
	rftmp = gaim_roomlist_field_new(GAIM_ROOMLIST_FIELD_INT,_("Users"),"#",FALSE);
	ltmp  = g_list_append(ltmp,rftmp);
	rftmp = gaim_roomlist_field_new(GAIM_ROOMLIST_FIELD_INT,_("Voice"),"v",FALSE);
	ltmp  = g_list_append(ltmp,rftmp);
	rftmp = gaim_roomlist_field_new(GAIM_ROOMLIST_FIELD_INT,_("Locked"),"l",FALSE);
	ltmp  = g_list_append(ltmp,rftmp);
	rftmp = gaim_roomlist_field_new(GAIM_ROOMLIST_FIELD_STRING,_("Rating"),"r",FALSE);
	ltmp  = g_list_append(ltmp,rftmp);
	gaim_roomlist_set_fields(data->roomlist,ltmp);

	/* Add the categories */
	for (stmp=data->categories;stmp;stmp=stmp->next) {
		cat       = stmp->data;
		cat->room = gaim_roomlist_room_new(GAIM_ROOMLIST_ROOMTYPE_CATEGORY,
						   g_strdup(cat->name),NULL); 
		gaim_roomlist_room_add_field(data->roomlist,cat->room,(gpointer)cat->id);
		gaim_roomlist_room_add(data->roomlist,cat->room);
	}
	return data->roomlist;
}

void pt_roomlist_expand_category(GaimRoomlist *list, GaimRoomlistRoom *category) 
{
	GaimConnection *gc   = gaim_account_get_connection(list->account);
	PTData         *data = gc->proto_data; 
	
	if (category->type != GAIM_ROOMLIST_ROOMTYPE_CATEGORY) return;
	gaim_roomlist_set_in_progress(data->roomlist,TRUE);
	
	pt_send_packet(data,PACKET_DO_LIST_CATEGORY,(long)g_list_nth_data(category->fields,0));
}
	
void pt_roomlist_cancel(GaimRoomlist *list) 
{
	GaimConnection *gc   = gaim_account_get_connection(list->account);
	PTData         *data = gc->proto_data;

	gaim_roomlist_set_in_progress(list, FALSE);

	if (data->roomlist == list) {
		data->roomlist = NULL;
		gaim_roomlist_unref(list);
	}
}

void pt_parse_rooms(PTData *data, char *packet)
{
	GaimRoomlistRoom *rm = NULL; GList *ltmp; PTCategory *exc = NULL;
	char **tokens,**tokens2, *ctmp, *nm = NULL, *id = NULL, *r = NULL; 
	int i, j, n = 0, v = 0, l = 0; 
		
	packet = strchr(packet,'='); *packet = 0; packet++; 
	ctmp   = strchr(packet,0xC8); *ctmp  = 0; ctmp++;
	
	for (ltmp=data->categories;ltmp;ltmp=ltmp->next)
		if (((PTCategory *)(ltmp->data))->id == atol(packet))
			exc = ltmp->data;

	if (!exc) {
		gaim_debug_error("paltalk","Unable to find category %s!\n",packet);
		return;
	}
	
	tokens = g_strsplit(ctmp,BSEP,-1);
	for (i=0;tokens[i] && *tokens[i];i++) {
		tokens2 = g_strsplit(tokens[i],FSEP,-1);
		for (j=0;tokens2[j] && *tokens2[j];j++) {
			ctmp = strchr(tokens2[j],'='); *ctmp = 0; ctmp++;
			if (!strcmp(tokens2[j],"id")) id = g_strdup(ctmp);
			if (!strcmp(tokens2[j],"#"))  n  = atoi(ctmp);
			if (!strcmp(tokens2[j],"v"))  v  = atoi(ctmp);
			if (!strcmp(tokens2[j],"l"))  l  = atoi(ctmp);
			if (!strcmp(tokens2[j],"r"))  r  = g_strdup(ctmp);
			if (!strcmp(tokens2[j],"nm")) nm = gaim_utf8_salvage(ctmp);
		}
		g_strfreev(tokens2);
		
		rm = gaim_roomlist_room_new(GAIM_ROOMLIST_ROOMTYPE_ROOM,nm,exc->room);
		gaim_roomlist_room_add_field(data->roomlist,rm,id);
		gaim_roomlist_room_add_field(data->roomlist,rm,(gpointer)n);
		gaim_roomlist_room_add_field(data->roomlist,rm,(gpointer)v);
		gaim_roomlist_room_add_field(data->roomlist,rm,(gpointer)l);
		gaim_roomlist_room_add_field(data->roomlist,rm,r);
		gaim_roomlist_room_add(data->roomlist,rm);
	}
	g_strfreev(tokens);
	gaim_roomlist_set_in_progress(data->roomlist,FALSE);
}

