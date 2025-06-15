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

#ifndef PALTALK_H
#define PALTALK_H

#ifdef _WIN32
#include <winsock.h>
#else
#include <netinet/in.h>
#endif

#include "debug.h"
#include "internal.h"
#include "account.h"
#include "roomlist.h"
#include "ft.h"
#include "mediastream.h"

#define DEFAULT_HD_SERIAL		0x261308E2
#define IE_PRODUCT_ID			"51873-335-9659427-09862"
#define WINBLOWS_VERSION		"5.0.2195.2.208"
#define MAC_ADDRESS			"006AF2C00886"
#define BSEP				"È"	/* 0xC8 */
#define FSEP 				"\n"
#define ROOM_ID_PRIVATE			0x082AL
#define PT_VERSION			0x0053

/* Buddy Status Longs  */
#define STATUS_BLOCKED          	0xFFFFFFFFL
#define STATUS_OFFLINE			0x00000000L
#define STATUS_ONLINE 			0x0000001EL
#define STATUS_AWAY   			0x00000046L
#define STATUS_DND    			0x0000005AL
#define STATUS_INVISIBLE		0x0000006EL

/* Status Text         */
#define SSTATUS_ONLINE			g_strdup(_("Online"))
#define SSTATUS_AWAY			g_strdup(_("Away"))
#define SSTATUS_DND			g_strdup(_("Do Not Disturb"))
#define SSTATUS_INVISIBLE		g_strdup(_("Invisible"))
#define SSTATUS_OFFLINE			g_strdup(_("Offline"))

/* Service URL Numbers */
#define SERVICE_URL_CHANGE_PASSWORD	0x00000010L
#define SERVICE_URL_SET_USER_INFO	0x00000022L
#define SERVICE_URL_CREATE_ROOM		0x00000334L

/* Packet Macros       */
#define PACKET_GET_LONG(X,O)		(long)ntohl(*(long *)(X+O))
#define PACKET_GET_SHORT(X,O)		(short)ntohs(*(short *)(X+O))
#define PACKET_GET_TYPE(X)		PACKET_GET_SHORT(X,0)
#define PACKET_GET_VERSION(X)		PACKET_GET_SHORT(X,2)
#define PACKET_GET_LENGTH(X)		PACKET_GET_SHORT(X,4)
#define PACKET_IS_OF_TYPE(X,Y)		(PACKET_GET_TYPE(X) == Y)

/* Packet Types        */
#define PACKET_FILE_XFER_RECV_INIT	0x0000		/* This is the same as XFER_REJECT */
#define PACKET_FILE_XFER_REJECT		-5002
#define PACKET_FILE_XFER_SEND_INIT	-5001
#define PACKET_GET_SERVICE_URL		-2600
#define PACKET_VERSION_INFO		-2128		
#define PACKET_CHECKSUMS		-2123		
#define PACKET_ECHO_RESPONSE		-2103		
#define PACKET_VERSIONS			-2102		
#define PACKET_UIN_FONTDEPTH_ETC	-2100		
#define PACKET_LOGIN			-1148
#define PACKET_GET_UIN			-1131
#define PACKET_LYMERICK			-1130
#define PACKET_ROOM_CLOSE		-940
#define PACKET_ROOM_NEW_USER_MIC	-932
#define PACKET_ROOM_RED_DOT_VIDEO	-931
#define PACKET_ROOM_RED_DOT_TEXT	-930
#define PACKET_ROOM_UNBAN_USER		-921
#define PACKET_ROOM_BAN_USER		-920
#define PACKET_ROOM_UNBOUNCE_USER	-911
#define PACKET_ROOM_GET_ADMIN_INFO	-900
#define PACKET_CHANGE_STATUS		-620
#define PACKET_UNBLOCK_BUDDY		-520
#define PACKET_BLOCK_BUDDY		-500
#define PACKET_EMAIL_VERIFICATION	-432
#define PACKET_ROOM_UNREQUEST_MIC	-399
#define PACKET_ROOM_REQUEST_MIC		-398
#define PACKET_ROOM_UNRED_DOT_USER	-397
#define PACKET_ROOM_BOUNCE_REASON	-390
#define PACKET_ROOM_MEDIA_SERVER_ACK	-383
#define PACKET_ROOM_REMOVE_ALL_HANDS	-382
#define PACKET_ROOM_RED_DOT_USER	-381
#define PACKET_ROOM_BOUNCE_USER		-380
#define PACKET_ROOM_INVITE_OUT		-360
#define PACKET_ROOM_TOGGLE_ALL_MICS	-355
#define PACKET_ROOM_SET_TOPIC		-351
#define PACKET_ROOM_MESSAGE_OUT		-350
#define PACKET_DO_LIST_CATEGORY		-330
#define PACKET_ROOM_LEAVE		-320
#define PACKET_ROOM_JOIN_AS_ADMIN	-316
#define PACKET_ROOM_JOIN		-310
#define PACKET_ROOM_PRIVATE_INVITE	-302
#define PACKET_LOGIN_NOT_COMPLETED	-160
#define PACKET_REDIRECT			-119
#define PACKET_HELLO			-117
#define PACKET_CLIENT_HELLO		-100
#define PACKET_DO_SEARCH		-69
#define PACKET_SEARCH_ERROR		-69
#define PACKET_ADD_BUDDY		-67		
#define PACKET_REMOVE_BUDDY		-66
#define PACKET_ANNOUNCEMENT		-39
#define PACKET_IM_OUT			-20
#define PACKET_IM_IN			0x0014
#define PACKET_MAINTENANCE_KICK		0x002A
#define PACKET_BUDDY_REMOVED		0x0042
#define PACKET_BUDDY_LIST		0x0043
#define PACKET_SEARCH_RESPONSE		0x0045
#define PACKET_LOOKAHEAD		0x0064
#define PACKET_UPGRADE			0x0078		/* Ignored               */
#define PACKET_ROOM_JOINED		0x0136
#define PACKET_ROOM_USER_JOINED		0x0137
#define PACKET_ROOM_TRANSMITTING_VIDEO	0x0138
#define PACKET_ROOM_MEDIA_SERVER	0x013B
#define PACKET_ROOM_USER_LEFT		0x0140
#define PACKET_ROOM_LIST		0x014C
#define PACKET_ROOM_USERLIST		0x0154
#define PACKET_ROOM_MESSAGE_IN		0x015E
#define PACKET_ROOM_TOPIC		0x015F
#define PACKET_ROOM_MIC_GIVEN_REMOVED	0x0163
#define PACKET_ROOM_INVITE_IN		0x0168
#define PACKET_ROOM_CLOSED		0x017C
#define PACKET_ROOM_USER_RED_DOT_ON	0x017D
#define PACKET_ROOM_USER_MUTE		0x017F
#define PACKET_ROOM_USER_RED_DOT_OFF	0x018D
#define PACKET_ROOM_USER_MICREQUEST_ON	0x018E
#define PACKET_ROOM_USER_MICREQUEST_OFF	0x018F
#define PACKET_BUDDY_STATUSCHANGE	0x0190
#define PACKET_USER_DATA		0x019A		/* Ignored - Until I find it useful.	*/
#define PACKET_CATEGORY_LIST		0x019C
#define PACKET_BLOCK_SUCCESSFUL		0x01F4
#define PACKET_BLOCKED_BUDDIES		0x01FE
#define PACKET_USER_STATUS		0x026C		/* Obselete in Gaim			*/
#define PACKET_FORCED_IM		0x0294		/* Kindof like a system message         */
#define PACKET_WM_MESSAGE		0x02B2		/* Ignored				*/
#define PACKET_ROOM_BANNER_URL		0x0320		/* Ignored               		*/
#define PACKET_ROOM_ADMIN_INFO		0x0384
#define PACKET_SERVER_ERROR		0x044C
#define PACKET_UIN_RESPONSE		0x046B
#define PACKET_SERVER_KEY		0x0474
#define PACKET_LOGIN_UNKNOWN		0x04A6		/* 0-length Unknown sent after login    */
#define PACKET_ROOM_PREMIUM		0x0528		/* Some Details Unknown  		*/
#define PACKET_USER_STATS		0x05DC		/* Ignored               		*/
#define PACKET_ECHO			0x0837		/* Some Details Unknown  		*/
#define PACKET_ROOM_UNKNOWN_ENCODED	0x084A		/* What the hell?                       */
#define PACKET_INTEROP_URL		0x0850		/* Obselete in Gaim      		*/
#define PACKET_POPUP_URL		0x09C4		/* Ignored               		*/
#define PACKET_SERVICE_URL		0x0A28
#define PACKET_FILE_XFER_REQUEST	0x1389
#define PACKET_FILE_XFER_REFUSED	0x138B
#define PACKET_FILE_XFER_ACCEPTED	0x138C
#define PACKET_FILE_XFER_ERROR		0x138D


/* Custom CBFLAGS */
#define GAIM_CBFLAGS_SPEAKING		0x0010
#define GAIM_CBFLAGS_REDDOT             0x0020
#define GAIM_CBFLAGS_VOICE_BLOCKED      0x0040
#define GAIM_CBFLAGS_VIDEO              0x0080
#define GAIM_CBFLAGS_MICREQUEST         0x0100 

typedef struct _PTData		PTData;
typedef struct _PTXferData	PTXferData;
typedef struct _PTRoomData	PTRoomData;
typedef struct _PTIm		PTIm;
typedef struct _PTCategory	PTCategory;

struct _PTData 
{
	unsigned long      time;	/* A Time-based variable                              */
	int                wierd;	/* A wierd number calculated by floating point ops    */
	int                fd;		/* Our connection to the server                       */
	struct sockaddr_in host;	/* The server                                         */
	char               *serverkey;	/* An encoding key, sent by the server                */
	long               uin;		/* Our UIN                                            */
	long               status;	/* Our status                                         */
	long               owner;	/* Room's owner (when joining as an admin)            */
	long               locked;	/* ID of the locked room we're about to enter         */
	GList              *xfers;	/* List of file transfers                             */
	GList              *categories; /* Chat room categories				      */
	GList              *chats;	/* List of PTRoomData for open chats                  */
	GList              *ims;        /* List of PTIm for open IMs                          */
	GaimAccount        *a;		/* Our Account                                        */
	GaimRoomlist       *roomlist;   /* Roomlist                                           */
};

struct _PTXferData
{
	gint               inpa;	/* Input watcher                                      */
	int                fd;		/* XFer's file descriptor                             */
	int                phase;	/* Which phase of xfer negociation we're in           */
	long               id;		/* XFer's ID                                          */
	long               uin;		/* UIN of the person on the other end                 */
	char               *who;	/* Nickname of the person on the other end            */
	char               *filename;	/* Filename                                           */
	PTData             *data;	/* Prpl data                                          */
};

struct _PTRoomData
{
	long               id;		/* ID of this room                                    */
	long               owner;	/* UIN of the room's owner                            */
	long		   u_bounce;	/* User to bounce from the room                       */
	char              *speaker;	/* Person currently using the mic                     */
	gboolean           admin;	/* Wether or not we're an admin in the room           */
	char         	   *topic;	/* Used to restore the topic if we couldn't change it */
	gboolean           mike;	/* Wether or not new users have voice privs.          */
	gboolean           text;	/* Wether or not 'reddot' effects text privs.         */
	gboolean           video;	/* Wether or not 'reddot' effects video privs.        */
	GList              *bounce;	/* List of bounced users                              */
	GList              *ban;	/* List of banned users                               */
	GList	           *users;	/* User-specific Data (GHashTables)                   */
	GaimMediaStream    *stream;	/* Media Stream                                       */
	gpointer            ptd;
};

struct _PTCategory
{
	char               *name;	/* Name of the category                               */
	long                id;		/* Category ID                                        */
	GaimRoomlistRoom   *room;	/* Roomlist representation                            */
};

struct _PTIm
{
	char *nick;			/* The other user's nick                              */
	char *uin;			/* The other user's UIN                               */
};

/* 	Core Functions 				*/
char         *pt_encode(PTData *data,char *str,int usekey,short the_short);
void          pt_send_packet(PTData *ptd, short type, ...);
char         *pt_convert_to_html(gpointer message);
char         *pt_convert_from_html(gpointer message);
void	      pt_callback(gpointer data, gint source, GaimInputCondition cond);
void          pt_login_callback(gpointer data, gint source, GaimInputCondition cond);

/*	Chat Functions				*/
char         *pt_get_chat_name(GHashTable *data);
void          pt_chat_invite(GaimConnection *gc, int id, const char *message, const char *who);
void          pt_set_chat_topic(GaimConnection *gc, int id, const char *topic);
void          pt_chat_join(GaimConnection *gc, GHashTable *data);
void          pt_chat_leave(GaimConnection *gc, int id);
int           pt_chat_send(GaimConnection *gc, int id, const char *what);
PTRoomData   *pt_get_room_data(PTData *data, int id);
char         *pt_get_cb_real_name(GaimConnection *gc, int id, const char *who);
GList        *pt_chat_join_info(GaimConnection *gc);
void          pt_room_data_destroy(PTData *data, PTRoomData *rd);
void          pt_room_media_server_callback(gpointer data, gint source, GaimInputCondition cond);

/*	Roomlist Functions			*/
GaimRoomlist *pt_roomlist_get(GaimConnection *gc);
void          pt_roomlist_expand_category(GaimRoomlist *list, GaimRoomlistRoom *category);
void          pt_roomlist_cancel(GaimRoomlist *list);
void          pt_parse_rooms(PTData *data, char *packet);

/* 	File Xfer Functions               	*/
gboolean      pt_can_receive_file(GaimConnection *gc, const char *who);
gpointer      pt_find_xfer(PTData *data, long id);
void          pt_xfer_connect(PTData *data, long id, const char *ip, short port);
void          pt_send_file(GaimConnection *gc, const char *who, const char *filename);
void          pt_recv_file(GaimConnection *gc, long id, char *from, long uin, char *fn); 
void          pt_xfer_destroy(GaimXfer *xfer);

/*      Media Stream Functions                  */
void pt_media_stream_audio_connect(PTData *data, PTRoomData *rd, const char *ip, short port);
void pt_media_stream_destroy(GaimMediaStream *stream);

/* 	Slash Commands                          */
void          pt_register_commands();

/* 	Actions                           	*/
void          pt_parse_search_results(GaimConnection *gc, char *packet);
GList        *pt_actions(GaimPlugin *plugin, gpointer context);
GList        *pt_blist_node_menu(GaimBlistNode *node);

#endif	/* PALTALK_H */
