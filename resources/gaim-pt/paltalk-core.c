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
#include "privacy.h"
#include <math.h>

static char *checksums[] = 
{
	"90",
	"938749351",
	"1123530166",
	"-1040381015",
	"-878176803",
	"{0A7FA8AB-9BC1-49b6-9C66-5AFFA4CD57AB}" /* Some sort of wierd COM-style version number */
};

static const char *lymerick = 	/* The lymerick used in encoding    */
	"Ginger was a big fat horse, a big fat horse was she. But don't tell that to MaryLou "
	"because in love with her is she.I tell you this in private, because I thought that y"
	"ou should know.But never say to MaryLou or both our heads will go.I've said it once,"
	" I've said it twice, I'll say it once again.Not a word of this to you know who or it"
	" will be our end!\r";

#define INIT_TIME(X) \
	X->time  = time(NULL) - 28800;		/* Local Time (PST) */
	
#define GET_WIERD_NUMBER(X) \
	X->time  = (X->time * 214013) + 2530876; \
	X->wierd = (int)((((((X->time >> 16) & 0x7FFF) / 32768) * 10) / 32678) * 200);
	
#define ENCODE_TIME_DIGIT(X) \
	(int)(floor((((((X * 214013) + 2530876) >> 16) & 0x7FFF) / 32678.0f) * 10.0f)) & 7

char *pt_encode(PTData *data,char *str,int variant,short the_short)
{
	GString *out; long i,cb = 42; char *tmp;

	out = g_string_new(""); 
	
	if (variant == 1 || variant == 2) {
		tmp = g_strdup(data->serverkey+4); tmp[3] = 0;
		cb  = atoi(tmp) - 509;
		g_free(tmp);
	}

	switch (variant) {
		case 0:
		case 1:
			for (i=0;i<strlen(str);i++) {
				g_string_append_printf(out,"%.3ld%d",
						(122 + (i*(13-i)) + str[i] + lymerick[cb+i]),
						ENCODE_TIME_DIGIT(data->time));
				data->time = (data->time * 214013) + 2530876;
			}
		break;
		case 3:
			cb = data->wierd;
		case 2:
			for (i=0;i<strlen(str);i++) {
				g_string_append_printf(out,"%.3ld%d",
						(122 + i + str[i] + lymerick[cb+i]),
						ENCODE_TIME_DIGIT(data->time));
				data->time = (data->time * 214013) + 2530876;
			}
		break;
		case 4:
			cb = 13;
			for (i=0;i<strlen(str);i++) {
				g_string_append_printf(out,"%.3ld%d",
						(122 + str[i] + lymerick[the_short+i] + (cb*i)),
						ENCODE_TIME_DIGIT(data->time));
				data->time = (data->time * 214013) + 2530876;
				cb--;
			}
		break;
	}

	tmp = out->str;
	g_string_free(out,FALSE);
	return tmp;
}

char *pt_convert_to_html(gpointer message)
{
	GString *out; char *tmp,*t2,d[11],t[6],ap[3],tz[5]; long ltmp; gboolean freetmp = FALSE;
	
	out = g_string_new("");
	
	/* If the string isn't valid UTF-8, we'll salvage what we can. */
	if (!g_utf8_validate(message,strlen(message),NULL)) {
	     message = gaim_utf8_salvage(message);
	     freetmp = TRUE;
	}
	tmp = message;

	/* Offline messages are indicated by <<(date time)>> */
	if (sscanf(tmp,"<<(%s %s %s %s)>>",d,t,ap,tz)) {
		tmp = strstr(tmp,")>>") + 3;
		if ((t2 = strstr(tz,")>>"))) *t2 = 0;
		g_string_append_printf(out,"[%s %s %s %s %s]\n",_("Sent On: "),d,t,ap,tz);
	}
	
	/* Escape any <'s that aren't part of a PHTML tag, replace PHTML tags with HTML Tags */
	for (;*tmp;tmp++) {
		if (*tmp == '<' && tmp[1] != 'p' && tmp[1] != '/') g_string_append(out,"&lt;");
		else if (sscanf(tmp,"<pfont color=\"#%ld\">",&ltmp)) {
			ltmp = ((ltmp & 0x0000FF) << 16) | (ltmp & 0x00FF00) | 
			       ((ltmp & 0xFF0000) >> 16);
			g_string_append_printf(out,"<font color=\"#%.6lx\">",ltmp);
			tmp = strchr(tmp,'>');
		} else if (sscanf(tmp,"<pfont-size=\"%ld\">",&ltmp)) {
			if (ltmp <= 8)      ltmp = 2;
			else if (ltmp < 12) ltmp = 3;
			else                ltmp = 4;
			g_string_append_printf(out,"<font size=\"%ld\">",ltmp);
			tmp = strchr(tmp,'>');
		} else if (sscanf(tmp,"<p%c",d)) {
			g_string_append_printf(out,"<%c",*d);
			tmp += 2;
		} else if (sscanf(tmp,"</p%c",d)) {
			g_string_append_printf(out,"</%c",*d);
			tmp += 3;
		} else g_string_append_c(out,*tmp);
	}
	if (freetmp) g_free(message);
	
	tmp = out->str;
	g_string_free(out,FALSE);	
	return tmp;
}

char *pt_convert_from_html(gpointer message)
{
	GString *out; char *tmp,d; long ltmp;

	out = g_string_new("");
	tmp = gaim_strcasereplace(message,"<FONT COLOR","<font color"); /* Needed for away msgs. */
	tmp = gaim_strcasereplace(tmp,"<FONT SIZE","<font size");	/* ditto.                */
	tmp = gaim_strcasereplace(tmp,"</FONT>","</font>");		/* ditto.                */
	tmp = gaim_strcasereplace(tmp,"<A HREF","<a href");

	for (;*tmp;tmp++) {
		if (sscanf(tmp,"<font color=\"#%lx\">",&ltmp)) {
			ltmp = ((ltmp & 0x0000FF) << 16) | (ltmp & 0x00FF00) | 
			       ((ltmp & 0xFF0000) >> 16);
			g_string_append_printf(out,"<pfont color=\"#%ld\">",ltmp);
			tmp = strchr(tmp,'>');
		} else if (sscanf(tmp,"<font size=\"%ld\">",&ltmp)) {
			if (ltmp < 3)      ltmp = 8;
			else if (ltmp < 4) ltmp = 10;
			else               ltmp = 12;
			g_string_append_printf(out,"<pfont-size=\"%ld\">",ltmp);
			tmp = strchr(tmp,'>');
		} else if (!g_ascii_strncasecmp(tmp,"<body",5)) {
			tmp = strchr(tmp,'>');
		} else if (!g_ascii_strncasecmp(tmp,"</body>",7)) {
			tmp += 6;
		} else if (sscanf(tmp,"</%c",&d)) {
			g_string_append_printf(out,"</p%c",g_ascii_tolower(d));
			tmp += 2;
		} else if (sscanf(tmp,"<%c",&d)) {
			g_string_append_printf(out,"<p%c",g_ascii_tolower(d));
			tmp++;
		} else if (!strncmp(tmp,"&lt;",4)) {
			g_string_append_c(out,'<');
			tmp += 3;
		} else if (!strncmp(tmp,"&gt;",4)) {
			g_string_append_c(out,'>');
			tmp += 3;
		} else if (!strncmp(tmp,"&amp;",5)) {
			g_string_append_c(out,'&');
			tmp += 4;
		} else if (!strncmp(tmp,"&quot;",6)) {
			g_string_append_c(out,'\"');
			tmp += 5;
		} else g_string_append_c(out,*tmp);
	}

	/* Paltalk _requires_ formatted text. */
	if (!strstr(out->str,"<pfont")) {
		out = g_string_prepend(out,"<pfont color=\"#0\"><pfont-size=\"10\">");
		out = g_string_append(out,"</pfont></pfont>");
	}
	
	tmp = out->str;
	g_string_free(out,FALSE);
	return tmp;
}

#ifdef DO_UNHANDLED
static void pt_unknown_packet(char *packet)
{
	GString *out; int i;
	
	out = g_string_new("Received Unknown Packet\n");
	g_string_append_printf(out,"\tType: 0x%.4x\n\tVersion: 0x%.4x\n\tLength: 0x%.4x\nData:\n",
		      PACKET_GET_TYPE(packet),PACKET_GET_VERSION(packet),PACKET_GET_LENGTH(packet));

	for (i=0;i<PACKET_GET_LENGTH(packet);i+=8) {
		g_string_append_printf(out,"\t%.2x %.2x %.2x %.2x",packet[i+6],packet[i+7],
				           packet[i+8],packet[i+9]);
		g_string_append_printf(out,"\t%.2x %.2x %.2x %.2x",packet[i+10],packet[i+11],
				           packet[i+12],packet[i+13]);

		if (!g_ascii_isprint(packet[i+6]))  packet[i+6]  = '.';
		if (!g_ascii_isprint(packet[i+7]))  packet[i+7]  = '.';
		if (!g_ascii_isprint(packet[i+8]))  packet[i+8]  = '.';
		if (!g_ascii_isprint(packet[i+9]))  packet[i+9]  = '.';
		if (!g_ascii_isprint(packet[i+10])) packet[i+10] = '.';
		if (!g_ascii_isprint(packet[i+11])) packet[i+11] = '.';
		if (!g_ascii_isprint(packet[i+12])) packet[i+12] = '.';
		if (!g_ascii_isprint(packet[i+13])) packet[i+13] = '.';

		g_string_append_printf(out,"\t%c %c %c %c",packet[i+6],packet[i+7],
				           packet[i+8],packet[i+9]);
		g_string_append_printf(out,"\t%c %c %c %c\n",packet[i+10],packet[i+11],
				           packet[i+12],packet[i+13]);
	}
	
	gaim_debug_misc("paltalk",out->str);
	g_string_free(out,TRUE);
}
#endif

void pt_send_packet(PTData *ptd, short type, ...)
{
	GString *out; PTXferData *xd; char **stmp,*ctmp; va_list args; long ltmp = 0; 
	short i = 0,j = 2;

	out  = g_string_new("");
	g_string_append_printf(out,"%c%c%c%c",
			           (type & 0xFF00) >> 8, (type & 0x00FF),
			           (PT_VERSION & 0xFF00) >> 8, (PT_VERSION & 0x00FF));
	va_start(args,type);
	
	switch (type) {
		case PACKET_FILE_XFER_RECV_INIT:
			i = 1; type = PACKET_FILE_XFER_REJECT;
			g_string_free(out,TRUE);
			out = g_string_new("");
			g_string_append_printf(out,"%c%c%c%c",
			           (type & 0xFF00) >> 8, (type & 0x00FF),
			           (PT_VERSION & 0xFF00) >> 8, (PT_VERSION & 0x00FF));
		case PACKET_FILE_XFER_REJECT:
			xd   = va_arg(args,PTXferData *);
			ltmp = htonl(xd->uin);
			i    = htons(i);
			
			g_string_append_len(out,"\x00\x0A",2);
			g_string_append_len(out,(char *)&ltmp,4);      ltmp = htonl(xd->id);
			g_string_append_len(out,(char *)&ltmp,4);
			g_string_append_len(out,(char *)&i,2);
		break;
		case PACKET_FILE_XFER_SEND_INIT:
			xd   = va_arg(args,PTXferData *);
			i    = htons(strlen(xd->filename) + 7);
			ltmp = htonl(xd->uin);
			
			g_string_append_len(out,(char *)&i,2);      
			g_string_append_len(out,(char *)&ltmp,4);
			g_string_append_printf(out,"C:\\%s",xd->filename);
		break;
		case PACKET_GET_SERVICE_URL:
			ltmp = htonl(va_arg(args,long));
			
			g_string_append_len(out,"\x00\x08",2);
			g_string_append_len(out,(char *)&ltmp,4);
			g_string_append_len(out,"\x00\x00\x00\x01",4);
		break;
		case PACKET_VERSION_INFO:
			i = htons(strlen(checksums[5]));
			
			g_string_append_len(out,(char *)&i,2);
			g_string_append(out,checksums[5]);
		break;
		case PACKET_CHECKSUMS:
			stmp    = g_new0(char *,6);
			stmp[0] = pt_encode(ptd,checksums[0],1,0); ltmp  = strlen(stmp[0]) + 9;
			stmp[1] = pt_encode(ptd,checksums[1],1,0); ltmp += strlen(stmp[1]);
			stmp[2] = pt_encode(ptd,checksums[2],1,0); ltmp += strlen(stmp[2]);
			stmp[3] = pt_encode(ptd,checksums[3],1,0); ltmp += strlen(stmp[3]);
			stmp[4] = pt_encode(ptd,checksums[4],1,0); ltmp += strlen(stmp[4]);
			stmp[5] = pt_encode(ptd,"0",1,0);          i     = htons(ltmp);
			
			g_string_append_len(out,(char *)&i,2);
			g_string_append_printf(out,"%s\n%s\n%s\n%s\n%s\n%s",
					           stmp[0], stmp[1], stmp[2], stmp[3], stmp[4],
					           stmp[5]);
			g_strfreev(stmp);
		break;
		case PACKET_ECHO_RESPONSE:
			ctmp  = va_arg(args,char *);
			i     = va_arg(args,int);
			j     = htons(i);
			
			g_string_append_len(out,(char *)&j,2);
			g_string_append_len(out,ctmp,i);
		break;
		case PACKET_VERSIONS: 
			ctmp    = va_arg(args,char *);
			stmp    = g_new0(char *,10); GET_WIERD_NUMBER(ptd);
			stmp[1] = g_strup(g_strdup_printf("%.8x",DEFAULT_HD_SERIAL));
			stmp[2] = pt_encode(ptd,stmp[1],3,0);		ltmp  = strlen(stmp[2])+27;
			stmp[3] = pt_encode(ptd,"????????",3,0);        ltmp += strlen(stmp[3]);
			stmp[4] = pt_encode(ptd,WINBLOWS_VERSION,3,0);  ltmp += strlen(stmp[4]);
			stmp[5] = pt_encode(ptd,ctmp,3,0);              ltmp += strlen(stmp[5]);
			stmp[6] = pt_encode(ptd,"-1",3,0);              ltmp += strlen(stmp[6])*2;
			stmp[7] = pt_encode(ptd,IE_PRODUCT_ID,3,0);     ltmp += strlen(stmp[7]);
			stmp[8] = g_strdup_printf("%d",ptd->wierd);     ltmp += strlen(stmp[8]);
			i       = htons(ltmp);    			ltmp  = htonl(ptd->uin);

			g_string_append_len(out,(char *)&i,2); 
			g_string_append_len(out,"\x00\x00\x00\x00\x00\x01",6);
			g_string_append_len(out,(char *)&ltmp,4);
			g_string_append_len(out,(char *)&ptd->host.sin_addr,4);
			g_string_append_len(out,(char *)&ptd->host.sin_port,2);
			g_string_append_printf(out,"%d,%s,%s,%s,%s,%s,0,0,%s,%s",ptd->wierd,
					           stmp[2], stmp[3], stmp[4], stmp[5], stmp[6],
					           stmp[6], stmp[7]);
			g_strfreev(stmp);
		break;
		case PACKET_UIN_FONTDEPTH_ETC:
			INIT_TIME(ptd); 
			ctmp    = g_strnfill(22,0);
			ctmp[0] = (ptd->time % 7) + 48;
			ctmp[1] = (ptd->time % 3) + 48;
			ltmp    = htonl(ptd->uin);
			
			for (i=0;i<strlen(IE_PRODUCT_ID);i++,j++)
				if (g_ascii_isdigit(*(IE_PRODUCT_ID+i)))
					ctmp[j] =  *(IE_PRODUCT_ID+i) + 
						     ((((j - 2) % 5) - 47) % 10) + 48;
			
			g_string_append_len(out,"\x00\x24\x00\x00\x00\x00\x00\x01",8);
			g_string_append_len(out,(char *)&ltmp,4);
			g_string_append_len(out,"\x00\x00\x04\x45",4);
			g_string_append_len(out,ctmp,22);
			g_free(ctmp);
		break;
		case PACKET_LOGIN:
			stmp    = g_new0(char *,3);
			stmp[0] = pt_encode(ptd,(char *)gaim_account_get_password(ptd->a),1,0);
			stmp[1] = pt_encode(ptd,inet_ntoa(ptd->host.sin_addr),2,0);
			i       = htons(strlen(stmp[0]) + strlen(stmp[1]) + 5);
			ltmp    = htonl(ptd->uin);
			
			g_string_append_len(out,(char *)&i,2); 
			g_string_append_len(out,(char *)&ltmp,4);
			g_string_append_printf(out,"%s\n%s",stmp[0], stmp[1]);
			g_strfreev(stmp);
		break;
		case PACKET_GET_UIN:
			i = htons(strlen(gaim_account_get_username(ptd->a)) + 4);
			
			g_string_append_len(out,(char *)&i,2);
			g_string_append_len(out,"\x00\x00\x00\x01",4);
			g_string_append(out,gaim_account_get_username(ptd->a));
		break;
		case PACKET_LYMERICK:
			stmp    = g_new0(char *,3);
			stmp[0] = g_strup(g_strdup_printf("%.8x",DEFAULT_HD_SERIAL));
			stmp[1] = pt_encode(ptd,stmp[0],0,0);
			ltmp    = htonl(ptd->uin);
			
			g_string_append_len(out,"\x00\x2E",2);
			g_string_append_len(out,(char *)&ltmp,4);
			g_string_append_len(out,"\x00\x00\x00\x01\x00\x02\x00\x00\x00\x1E",10);
			g_string_append(out,stmp[1]);
			g_strfreev(stmp);
		break;
		case PACKET_ROOM_RED_DOT_TEXT:
		case PACKET_ROOM_RED_DOT_VIDEO:
		case PACKET_ROOM_TOGGLE_ALL_MICS:
		case PACKET_ROOM_MEDIA_SERVER_ACK:
			ltmp = htonl(va_arg(args,long));
			g_string_append_len(out,"\x00\x06",2);
			g_string_append_len(out,(char *)&ltmp,4);

			i = htons(va_arg(args,int));
			g_string_append_len(out,(char *)&i,2);
		break;
		case PACKET_ROOM_BOUNCE_REASON:
			ctmp = va_arg(args,char *);
			i    = htons(strlen(ctmp)+10);
			g_string_append_len(out,(char *)&i,2);
			
			ltmp = htonl(va_arg(args,long)); 
			g_string_append_len(out,(char *)&ltmp,4);   
			ltmp = htonl(va_arg(args,long));
			g_string_append_len(out,(char *)&ltmp,4);
			g_string_append_printf(out,"BR: %s",ctmp);
		break;
		case PACKET_ROOM_BOUNCE_USER:
		case PACKET_ROOM_UNBOUNCE_USER:
		case PACKET_ROOM_RED_DOT_USER:
		case PACKET_ROOM_UNRED_DOT_USER:
		case PACKET_ROOM_UNBAN_USER:
		case PACKET_ROOM_BAN_USER:
		case PACKET_ROOM_INVITE_OUT:
			ltmp = htonl(va_arg(args,long)); 
			g_string_append_len(out,"\x00\x08",2);
			g_string_append_len(out,(char *)&ltmp,4);   
			ltmp = htonl(va_arg(args,long));
			g_string_append_len(out,(char *)&ltmp,4);
		break;
		case PACKET_ROOM_REQUEST_MIC:
		case PACKET_ROOM_UNREQUEST_MIC:
		case PACKET_ROOM_CLOSE:
		case PACKET_ROOM_REMOVE_ALL_HANDS:
		case PACKET_ROOM_GET_ADMIN_INFO:
		case PACKET_UNBLOCK_BUDDY:
		case PACKET_BLOCK_BUDDY:
		case PACKET_ROOM_LEAVE:
		case PACKET_ADD_BUDDY:
		case PACKET_REMOVE_BUDDY:
		case PACKET_CHANGE_STATUS:
			ltmp = htonl(va_arg(args,long)); 
			g_string_append_len(out,"\x00\x04",2);
			g_string_append_len(out,(char *)&ltmp,4);
		break;
		case PACKET_ROOM_SET_TOPIC:
		case PACKET_ROOM_MESSAGE_OUT:
		case PACKET_IM_OUT:
			ctmp = va_arg(args,char *);
			i     = htons(strlen(ctmp) + 4);
			ltmp  = htonl(va_arg(args,long));
		
			g_string_append_len(out,(char *)&i,2); 
			g_string_append_len(out,(char *)&ltmp,4);
			g_string_append(out,ctmp);
		break;
		case PACKET_DO_LIST_CATEGORY:
			ltmp = htonl(va_arg(args,long));
			
			g_string_append_len(out,"\x00\x0C\x34\xE0\x12\x00\x00\x00\x00\x01",10);
			g_string_append_len(out,(char *)&ltmp,4);
		break;
		case PACKET_ROOM_JOIN_AS_ADMIN:
			ltmp = htonl(ptd->owner);
			
			g_string_append_len(out,"\x00\x0C",2);
			g_string_append_len(out,(char *)&ltmp,4); ltmp = htonl(va_arg(args,long));
			g_string_append_len(out,(char *)&ltmp,4);
			g_string_append_len(out,"\x00\x00\x08\x2A",4);
		break;
		case PACKET_ROOM_JOIN:
			i    = va_arg(args,int);
			ltmp = htonl(va_arg(args,long));
			
			
			if (i) {
				ctmp = va_arg(args,char *);
				i    = htons(strlen(ctmp) + 10);
				
				g_string_append_len(out,(char *)&i,2);
				g_string_append_len(out,(char *)&ltmp,4);
				g_string_append_len(out,"\x00\x00\x00\x00\x08\x2A",6);
				g_string_append(out,ctmp);
			} else {
				g_string_append_len(out,"\x00\x0A",2);
				g_string_append_len(out,(char *)&ltmp,4);
				g_string_append_len(out,"\x00\x00\x00\x00\x08\x2A",6);
			}
		break;
		case PACKET_ROOM_PRIVATE_INVITE:
			ltmp = htonl(va_arg(args,long));
			
			g_string_append_len(out,"\x00\x0C\x00\x01\x00\x00\x08\x2A\x00\x01",10);
			g_string_append_len(out,(char *)&ltmp,4);
		break;
		case PACKET_DO_SEARCH:
			ctmp  = va_arg(args,char *);
			i     = htons(strlen(ctmp));
			
			g_string_append_len(out,(char *)&i,2);
			g_string_append(out,ctmp);
		break;
	}

	va_end(args);
	write(ptd->fd,out->str,out->len);
	g_string_free(out,TRUE);
}

void pt_callback(gpointer data, gint source, GaimInputCondition cond)
{
	GaimConnection *gc = data; PTData *ptd = gc->proto_data; GaimXfer *xfer; GaimBuddy *b;
	GHashTable *htmp; PTRoomData *rd; GList *sltmp; GaimConversation *c; PTCategory *gtmp;
	short waitlen, cur = 0, br = 0; struct in_addr intmp; long ltmp = 0; int i,j;
	char btmp[1024], btmp2[1024], *waitbuf, *ctmp=NULL, *ctmp2 = NULL, *ctmp3 = NULL, **tokens;
	char **tokens2, *ctmp4 = NULL; gboolean handled = FALSE, gbtmp = FALSE;

	if (source == -1) {
		gaim_connection_error(gc,_("Unable to connect."));
		return;
	}

	if (!ptd->fd) ptd->fd = source;

	if (read(source,btmp,6) < 0) {
		gaim_connection_error(gc,_("Disconnected."));
		return;
	}

	if (btmp[0] == 0 && btmp[1] == 0 && btmp[3] == 0) {
		gaim_connection_error(gc,_("Disconnected."));
		return;
	}

	waitlen = PACKET_GET_LENGTH(btmp);
	waitbuf = g_strnfill(waitlen+7,0);
	memcpy(waitbuf,btmp,6);

	while (cur < waitlen) {
		if ((br = read(source,waitbuf+cur+6,waitlen-cur)) < 0) {
			g_free(waitbuf);
			gaim_connection_error(gc,_("Disconnected."));
			return;
		}
		cur += br;
	}

	switch (PACKET_GET_TYPE(waitbuf)) {
		case PACKET_LOGIN_NOT_COMPLETED:
			if (PACKET_GET_LENGTH(waitbuf) != 0)
				gaim_connection_error(gc,_("Login not completed."));
			handled = TRUE;
		break;
		case PACKET_REDIRECT:
			close(ptd->fd); ptd->fd = -1;
			gaim_input_remove(gc->inpa);
			memcpy(&ptd->host.sin_addr,waitbuf+6,4);
			memcpy(&ptd->host.sin_port,waitbuf+10,2);

			if (gaim_proxy_connect(ptd->a,
					       inet_ntoa(ptd->host.sin_addr),
					       ntohs(ptd->host.sin_port),
					       pt_login_callback,gc)) 
				gaim_connection_error(gc,_("Connection Failed."));
			handled = TRUE;
		break;
		case PACKET_HELLO:
			gaim_connection_update_progress(gc,_("Got Hello"),2,5);
			if (ptd->uin) pt_send_packet(ptd,PACKET_LYMERICK);
			else          pt_send_packet(ptd,PACKET_GET_UIN);
			handled = TRUE;
		break;
		case PACKET_SEARCH_ERROR:
			gaim_notify_error(gc,_("Search Results"),_("Search Results"),
					  _("Your search produced no results."));
			handled = TRUE;
		break;
		case PACKET_ANNOUNCEMENT:
			gaim_notify_info(gc,_("Paltalk Announcement"),_("Paltalk Announcement"),
					 waitbuf+6);
			handled = TRUE;
		break;
		case PACKET_FORCED_IM:
			tokens = g_strsplit(waitbuf+6,FSEP,-1);
			for (i=0;tokens[i] && *tokens[i];i++) {
				if ((ctmp = strchr(tokens[i],'='))) *ctmp = 0; ctmp++;
				if (!strcmp(tokens[i],"nickname"))  ctmp2 = g_strdup(ctmp);
				else if (!strcmp(tokens[i],"msg"))  ctmp3 = g_strdup(ctmp);
				else if (!strcmp(tokens[i],"uid"))  ctmp4 = g_strdup(ctmp);
				else gaim_debug_misc("paltalk","Unknown Value: %s",tokens[i]);
			}
			
			ctmp3 = pt_convert_to_html(ctmp3);
			if (strstr(ctmp3,">[Auto-Response]")) {
				ltmp |= GAIM_CONV_IM_AUTO_RESP;
				ctmp3 = gaim_strcasereplace(ctmp,"[Auto-Response]","<b></b>");
			}

			/* I'm just too fucking lazy to add another temp var. */
			ctmp                  = (char *)g_new0(PTIm,1);
			((PTIm *)ctmp)->uin   = g_strdup(ctmp4);
			((PTIm *)ctmp)->nick  = g_strdup(ctmp2);
			ptd->ims              = g_list_append(ptd->ims,ctmp);

			serv_got_im(gc,ctmp2,ctmp3,0,time(NULL));
			g_free(ctmp2);
			g_free(ctmp3);
			g_strfreev(tokens);
			handled = TRUE;
		break;
		case PACKET_IM_IN:
			ctmp = pt_convert_to_html(waitbuf+10);
			g_snprintf(btmp,12,"%ld",PACKET_GET_LONG(waitbuf,6));
			
			if (strstr(ctmp,">[Auto-Response]")) {
				ltmp |= GAIM_CONV_IM_AUTO_RESP;
				ctmp  = gaim_strcasereplace(ctmp,"[Auto-Response]","<b></b>");
			}

			/* I'm just too fucking lazy to add another temp var. */
			ctmp2                 = (char *)g_new0(PTIm,1);
			((PTIm *)ctmp2)->uin  = g_strdup(btmp);
			((PTIm *)ctmp2)->nick = pt_get_cb_real_name(gc,-1,btmp);
			ptd->ims              = g_list_append(ptd->ims,ctmp2);
			
			serv_got_im(gc,btmp,ctmp,ltmp,time(NULL));
			g_free(ctmp);
			handled = TRUE;
		break;
		case PACKET_BUDDY_REMOVED:
			if ((b = gaim_find_buddy(ptd->a,(const char *)(waitbuf+6)))) 
				 gaim_blist_remove_buddy(b);
			handled = TRUE;
		break;
		case PACKET_BLOCKED_BUDDIES:
			gbtmp = TRUE;
		case PACKET_BUDDY_LIST:
			tokens = g_strsplit(waitbuf+6,BSEP,-1);
			
			if (!gaim_find_group(_("Paltalk"))) 
				gaim_blist_add_group(gaim_group_new(_("Paltalk")),NULL);
		
			for (i=0;tokens[i] && *tokens[i];i++) {
				ctmp = strchr(tokens[i],'\n'); *ctmp = 0; ctmp += 10;
				if (!gbtmp) {
					if (!(b = gaim_find_buddy(ptd->a,tokens[i]+4)))
						b = gaim_buddy_new(ptd->a,tokens[i]+4,NULL);
					gaim_blist_add_buddy(b,NULL,gaim_find_group(_("Paltalk")),
							     NULL);
					serv_got_alias(gc,tokens[i]+4,ctmp);
				} else 	gaim_privacy_deny_add(ptd->a,btmp,TRUE);
			}

			g_strfreev(tokens);
			handled = TRUE;
		break;
		case PACKET_SEARCH_RESPONSE:
			pt_parse_search_results(gc,waitbuf+6);
			handled = TRUE;
		break;
		case PACKET_LOOKAHEAD:
			if (PACKET_GET_LENGTH(waitbuf) > 4)
				gaim_notify_error(gc,_("Error"),_("Paltalk Error"),waitbuf+10);
			handled = TRUE;
		break;
		case PACKET_ROOM_JOINED:
			if (!(rd = pt_get_room_data(ptd,PACKET_GET_LONG(waitbuf,6)))) {
				rd         = g_new0(PTRoomData,1);
				rd->id     = PACKET_GET_LONG(waitbuf,6);
				rd->ptd    = ptd;
				ptd->chats = g_list_append(ptd->chats,rd);
			}

			ctmp = strchr(waitbuf+29,'\n'); *ctmp = 0; ctmp = waitbuf+29;
			serv_got_joined_chat(gc,PACKET_GET_LONG(waitbuf,6),ctmp);
			c    = gaim_find_chat(gc,rd->id);
//			gaim_conversation_set_audio_stream(c,rd->stream);
			handled = TRUE;
		break;
		case PACKET_ROOM_MEDIA_SERVER:
			if (!(rd = pt_get_room_data(ptd,PACKET_GET_LONG(waitbuf,6)))) {
				rd         = g_new0(PTRoomData,1);
				rd->id     = PACKET_GET_LONG(waitbuf,6);
				rd->ptd    = ptd;
				ptd->chats = g_list_append(ptd->chats,rd);
			}
			ctmp = inet_ntoa(*((struct in_addr *)(waitbuf+10)));
			ltmp = ntohs(*(short *)(waitbuf+20));
			pt_media_stream_audio_connect(ptd,rd,ctmp,ltmp);
			handled = TRUE;
		break;
		case PACKET_ROOM_USER_LEFT:
			c  = gaim_find_chat(gc,PACKET_GET_LONG(waitbuf,6));
			rd = pt_get_room_data(ptd,PACKET_GET_LONG(waitbuf,6));

			g_snprintf(btmp,12,"%ld",PACKET_GET_LONG(waitbuf,10));
			ctmp = pt_get_cb_real_name(gc,rd->id,btmp);
			gaim_conv_chat_remove_user(GAIM_CONV_CHAT(c),ctmp,NULL);

			for (sltmp=rd->users;sltmp && sltmp->data;sltmp=sltmp->next) {
				if ((htmp = sltmp->data) &&  g_hash_table_lookup(htmp,"uid") &&
				    !strcmp(btmp,g_hash_table_lookup(htmp,"uid"))) {
					rd->users = g_list_remove(rd->users,sltmp->data);
					g_hash_table_destroy(htmp);
				}
			}
			
			g_free(ctmp);
			handled = TRUE;
		break;
		case PACKET_CATEGORY_LIST:
			tokens = g_strsplit(waitbuf+6,BSEP,-1);
	
			for (i=0;tokens[i] && *tokens[i];i++) {
				gtmp  = g_new0(PTCategory,1);
				ctmp  = strstr(tokens[i],"code="); 
				ctmp2 = strchr(ctmp,'\n');
				ctmp += 5; *ctmp2 = 0; ctmp2 += 7;
				
				gtmp->name      = g_strdup(ctmp2);
				gtmp->id        = atol(ctmp);
				ptd->categories = g_list_append(ptd->categories,gtmp);
			}

			g_strfreev(tokens);
			handled = TRUE;
		break;
		case PACKET_ROOM_LIST:
			pt_parse_rooms(ptd,waitbuf+6);
			handled = TRUE;
		break;
		case PACKET_ROOM_USER_JOINED:
		case PACKET_ROOM_USERLIST:
			ctmp   = strchr(waitbuf+6,'\n'); *ctmp = 0; ctmp++; 
			ltmp   = atol(waitbuf+15);
			rd     = pt_get_room_data(ptd,ltmp);
			tokens = g_strsplit(ctmp,BSEP,-1);
				
			if (rd) {
			for (i=0;tokens[i] && *tokens[i];i++) {
				htmp    = g_hash_table_new_full(g_str_hash,g_str_equal,g_free,
								g_free);
				tokens2 = g_strsplit(tokens[i],FSEP,-1);
				for (j=0;tokens2[j];j++) {
					ctmp = strchr(tokens2[j],'='); *ctmp = 0; ctmp++;
					g_hash_table_insert(htmp,g_strdup(tokens2[j]),
							         g_strdup(ctmp));
//					gaim_debug_misc("paltalk","tokens2[j]: %s=%s\n",tokens2[j],
//							ctmp);
				}
				g_strfreev(tokens2);
				
				j         = GAIM_CBFLAGS_NONE; 
				ctmp      = g_hash_table_lookup(htmp,"admin");
				if (ctmp && atoi(ctmp) == 1)  {
					j   |= GAIM_CBFLAGS_OP;
					ctmp = g_hash_table_lookup(htmp,"uid");
					if (ctmp && atol(ctmp) == ptd->uin) {
						rd->owner = ptd->owner;
						rd->admin = TRUE;
						pt_send_packet(ptd,PACKET_ROOM_GET_ADMIN_INFO,
							       rd->id);
					}	
				}

				ctmp = g_hash_table_lookup(htmp,"req");
				if (ctmp && atoi(ctmp) > 0) j |= GAIM_CBFLAGS_MICREQUEST;
				
				ctmp = g_hash_table_lookup(htmp,"pub");
				if (ctmp && *ctmp == 'y') j |= GAIM_CBFLAGS_VIDEO;
				
				c    = gaim_find_chat(gc,ltmp);
				ctmp = g_hash_table_lookup(htmp,"nickname");
				if (!gaim_conv_chat_find_user(GAIM_CONV_CHAT(c),ctmp)) {
					rd->users = g_list_append(rd->users,htmp);
					gaim_conv_chat_add_user(GAIM_CONV_CHAT(c),ctmp,NULL,j,TRUE);
				} else g_hash_table_destroy(htmp);
			}}
			g_strfreev(tokens);
			handled   = TRUE;
		break;
		case PACKET_ROOM_MESSAGE_IN:
			g_snprintf(btmp,12,"%ld",PACKET_GET_LONG(waitbuf,10));
			ctmp  = pt_get_cb_real_name(gc,PACKET_GET_LONG(waitbuf,6),btmp);
			c     = gaim_find_chat(gc,PACKET_GET_LONG(waitbuf,6));
			ctmp2 = waitbuf+14; ltmp = GAIM_MESSAGE_RECV;

			if (strcmp(ctmp,"Paltalk") && strncmp(waitbuf+14,"Whisper sent.",13)) {
				if (!strncmp(ctmp2+1,"<pb><pi>***** Start Whisper",27)) {
					ctmp2 += 28;
					ctmp2  = gaim_strcasereplace(ctmp2,"\n","<pb></pb>");
					ctmp2  = gaim_strcasereplace(ctmp2,"***** End Whisper"," ");
					ltmp  |= GAIM_MESSAGE_WHISPER;
				}
				ctmp2 = pt_convert_to_html(ctmp2);
				gaim_conv_chat_write(GAIM_CONV_CHAT(c),ctmp,ctmp2,ltmp,time(NULL));
				g_free(ctmp2);
			}
			g_free(ctmp);
			handled = TRUE;
		break;
		case PACKET_ROOM_TOPIC:
			if ((c = gaim_find_chat(gc,PACKET_GET_LONG(waitbuf,6)))) 
				gaim_conv_chat_set_topic(GAIM_CONV_CHAT(c),
						         gaim_connection_get_display_name(gc),
							 waitbuf+14);
			handled = TRUE;
		break;
		case PACKET_ROOM_MIC_GIVEN_REMOVED:
			ltmp = PACKET_GET_LONG(waitbuf,12);
			i    = PACKET_GET_SHORT(waitbuf,10);

			if ((c = gaim_find_chat(gc,PACKET_GET_LONG(waitbuf,6)))) {
				g_snprintf(btmp,12,"%ld",ltmp);
				ctmp  = pt_get_cb_real_name(gc,PACKET_GET_LONG(waitbuf,6),btmp);
				ctmp2 = g_strdup_printf("%s has %s all mics.",ctmp,
							i ? _("allowed") : _("restricted"));
				gaim_conv_chat_write(GAIM_CONV_CHAT(c),"",ctmp2,
						     GAIM_MESSAGE_SYSTEM,time(NULL));
				g_free(ctmp2);
				g_free(ctmp);
			}

			handled = TRUE;
		break;
		case PACKET_ROOM_INVITE_IN:
			htmp   = g_hash_table_new_full(g_str_hash,g_str_equal,g_free,g_free);
			tokens = g_strsplit(waitbuf+6,FSEP,-1);
			
			for (i=0;tokens[i];i++) {
				ctmp = strchr(tokens[i],'='); *ctmp = 0; ctmp++;
				g_hash_table_insert(htmp,g_strdup(tokens[i]),g_strdup(ctmp));
			}
			
			serv_got_chat_invite(gc,g_hash_table_lookup(htmp,"group_name"),
					        g_hash_table_lookup(htmp,"nickname"),NULL,htmp);
			g_strfreev(tokens);
			handled = TRUE;
		break;
		case PACKET_ROOM_CLOSED:
			gaim_notify_info(gc,_("Paltalk"),_("Room Closed"),waitbuf+14);
			pt_chat_leave(gc,PACKET_GET_LONG(waitbuf,6));
			handled = TRUE;
		break;
		case PACKET_ROOM_USER_RED_DOT_ON:
			gbtmp = TRUE;
		case PACKET_ROOM_USER_RED_DOT_OFF:
			ltmp  = PACKET_GET_LONG(waitbuf,6);
			c     = gaim_find_chat(gc,ltmp);
			ctmp  = g_strdup_printf("%ld",PACKET_GET_LONG(waitbuf,10));
			ctmp2 = pt_get_cb_real_name(gc,ltmp,ctmp);

			if (c) {
				ltmp = gaim_conv_chat_user_get_flags(GAIM_CONV_CHAT(c),ctmp2);
				if ((ltmp & GAIM_CBFLAGS_REDDOT) && !gbtmp) 
					ltmp &= ~(GAIM_CBFLAGS_REDDOT);
				else	ltmp |= GAIM_CBFLAGS_REDDOT;
				gaim_conv_chat_user_set_flags(GAIM_CONV_CHAT(c),ctmp2,ltmp);

				if (gbtmp) ctmp3 = g_strdup_printf(_("%s has been reddotted."),ctmp2);
				else       ctmp3 = g_strdup_printf(_("%s has been un-reddotted."),ctmp2);
				gaim_conv_chat_write(GAIM_CONV_CHAT(c),NULL,ctmp3,
							GAIM_MESSAGE_RECV|GAIM_MESSAGE_SYSTEM,time(NULL));
				g_free(ctmp3);
			}
			g_free(ctmp);
			g_free(ctmp2);
			handled = TRUE;
		break;
		case PACKET_ROOM_USER_MUTE:
			/* TODO: Implement this with A/V Support */
			handled = TRUE;
		break;
		case PACKET_ROOM_USER_MICREQUEST_ON:
			gbtmp = TRUE;
		case PACKET_ROOM_USER_MICREQUEST_OFF:
			ltmp  = PACKET_GET_LONG(waitbuf,6);
			c     = gaim_find_chat(gc,ltmp);
			ctmp  = g_strdup_printf("%ld",PACKET_GET_LONG(waitbuf,10));
			ctmp2 = pt_get_cb_real_name(gc,ltmp,ctmp);

			if (c) {
				ltmp = gaim_conv_chat_user_get_flags(GAIM_CONV_CHAT(c),ctmp2);
				if ((ltmp & GAIM_CBFLAGS_MICREQUEST) && !gbtmp) 
					ltmp &= ~(GAIM_CBFLAGS_MICREQUEST);
				else	ltmp |= GAIM_CBFLAGS_MICREQUEST;
				gaim_conv_chat_user_set_flags(GAIM_CONV_CHAT(c),ctmp2,ltmp);

				if (gbtmp) ctmp3 = g_strdup_printf(_("%s is requesting the mic."),ctmp2);
				else       ctmp3 = g_strdup_printf(_("%s is no-longer requesting the mic."),ctmp2);
				gaim_conv_chat_write(GAIM_CONV_CHAT(c),NULL,ctmp3,
							GAIM_MESSAGE_RECV|GAIM_MESSAGE_SYSTEM,time(NULL));
				g_free(ctmp3);
			}
			g_free(ctmp);
			g_free(ctmp2);
			handled = TRUE;
		break;
		case PACKET_ROOM_TRANSMITTING_VIDEO:
#if 0		
			ltmp  = PACKET_GET_LONG(waitbuf,6);
			c     = gaim_find_chat(gc,ltmp);
			ctmp  = g_strdup_printf("%ld",PACKET_GET_LONG(waitbuf,10));
			ctmp2 = pt_get_cb_real_name(gc,ltmp,ctmp);

			if (c && PACKET_GET_SHORT(waitbuf,14) == 2) {
				ltmp = gaim_conv_chat_user_get_flags(GAIM_CONV_CHAT(c),ctmp2);
				if ((ltmp & GAIM_CBFLAGS_MICREQUEST) && !gbtmp) 
					ltmp &= ~(GAIM_CBFLAGS_MICREQUEST);
				else	ltmp |= GAIM_CBFLAGS_MICREQUEST;
				gaim_conv_chat_user_set_flags(GAIM_CONV_CHAT(c),ctmp2,ltmp);
			}
			g_free(ctmp2);
			g_free(ctmp);
#endif
			handled = TRUE;
		break;
		case PACKET_BUDDY_STATUSCHANGE:
			g_snprintf(btmp,12,"%ld",PACKET_GET_LONG(waitbuf,6));
			if ((b = gaim_find_buddy(ptd->a,btmp))) {
				switch (PACKET_GET_LONG(waitbuf,10)) {
					case STATUS_OFFLINE:   b->uc = 0x00; break;
					case STATUS_ONLINE:    b->uc = 0x01; break;
					case STATUS_AWAY:      b->uc = 0x02; break;
					case STATUS_INVISIBLE: b->uc = 0x04; break;
					case STATUS_DND:       b->uc = 0x08; break;
					case STATUS_BLOCKED:   b->uc = 0x10; break;
				}
				if (b->uc == 0x01) 
					gaim_blist_update_buddy_presence(b,TRUE);
				if (b->uc == 0x00 || b->uc == 0x10) 
					gaim_blist_update_buddy_presence(b,FALSE);
				gaim_blist_update_buddy_status(b,b->uc);
			}
		
			if (gc->state != GAIM_CONNECTED) {
				ptd->status = STATUS_ONLINE;
				gaim_connection_set_state(gc,GAIM_CONNECTED);
				pt_send_packet(ptd,PACKET_CHECKSUMS);
				pt_send_packet(ptd,PACKET_VERSIONS,MAC_ADDRESS);
				pt_send_packet(ptd,PACKET_UIN_FONTDEPTH_ETC);
				pt_send_packet(ptd,PACKET_VERSION_INFO);
			}
		
			handled = TRUE;
		break;
		case PACKET_BLOCK_SUCCESSFUL:
			g_snprintf(btmp,12,"%ld",PACKET_GET_LONG(waitbuf,6));
			if (waitbuf[11]) serv_add_deny(gc,btmp);
			else             serv_rem_deny(gc,btmp);
			handled = TRUE;
		break;
		case PACKET_ROOM_ADMIN_INFO:
			ctmp = strchr(waitbuf+6,'\n'); *ctmp = 0; ctmp++; ctmp3 = NULL;
			ltmp = atol(waitbuf+12);
			rd   = pt_get_room_data(ptd,ltmp);
			
			/* Remove bans first */
			ctmp2 = strrchr(ctmp,0xC8);  *ctmp2 = 0; ctmp2++;
			if (!strncmp(ctmp2,"ban=",4)) ctmp3 = g_strdup(ctmp2+4);
						
			tokens = g_strsplit(ctmp,FSEP,-1);
			for (i=0;tokens[i] && *tokens[i];i++) {
				if ((ctmp = strchr(tokens[i],'='))) { *ctmp = 0; ctmp++; }
				if (!strcmp(tokens[i],"mike"))   rd->mike  = atol(ctmp);
				if (!strcmp(tokens[i],"text"))   rd->text  = atol(ctmp);
				if (!strcmp(tokens[i],"video"))  rd->video = atol(ctmp);
				if (!strcmp(tokens[i],"bounce")) ctmp2     = g_strdup(ctmp);
			}			
			
			if (ctmp2) {
				for (sltmp=rd->bounce;sltmp && sltmp->data;sltmp=sltmp->next) {
					gaim_debug_misc("paltalk","sltmp = %p\n",sltmp);
					if (sltmp->data) {
						g_free(sltmp->data);
					        rd->bounce = g_list_remove(rd->bounce,sltmp->data);
					}
				}
				rd->bounce = NULL;
				tokens2 = g_strsplit(ctmp2,BSEP,-1);
				for (j=0;tokens2[j] && *tokens2[j];j++)
					rd->bounce = g_list_append(rd->bounce,g_strdup(tokens2[j]));
				g_strfreev(tokens2);
				g_free(ctmp2);
			}
			
			if (ctmp3) {
				gaim_debug_misc("paltalk","rd = %p\nrd->ban = %p\n",rd,rd->ban);
				for (sltmp=rd->ban;sltmp && sltmp->data;sltmp=sltmp->next) {
						gaim_debug_misc("paltalk","sltmp = %p\n",sltmp);
						if (sltmp->data) {
						       rd->ban = g_list_remove(rd->ban,sltmp->data);
						       g_free(sltmp->data);
						}
				} 
				rd->ban = NULL;
				tokens2 = g_strsplit(ctmp3,FSEP,-1);
				for (j=0;tokens2[j] && *tokens2[j];j++) 
					rd->ban = g_list_append(rd->ban,g_strdup(tokens2[j]));
				g_strfreev(tokens2);
				g_free(ctmp3);
			}
			
			handled = TRUE;
		break;
		case PACKET_MAINTENANCE_KICK:
		case PACKET_SERVER_ERROR:
			gaim_connection_error(gc,waitbuf+6);
			handled = TRUE;
		break;
		case PACKET_UIN_RESPONSE:
			if (!strncmp(waitbuf+6,"uid=-1",6)) 
				gaim_connection_error(gc,_("Your nickname is invalid."));
			else {
				ctmp     = strchr(waitbuf+6,'\n'); *ctmp = 0; ctmp += 10;
				ptd->uin = atol(waitbuf+10); 
				close(ptd->fd);
				
				g_snprintf(btmp2,12,"%ld",ptd->uin);
				g_strdelimit(ctmp,"\n",' ');
				
				gaim_account_set_username(ptd->a,btmp2);
				gaim_account_set_alias(ptd->a,ctmp);
				gaim_connection_set_display_name(gc,ctmp);

				if (gaim_proxy_connect(ptd->a,
					       inet_ntoa(ptd->host.sin_addr),
					       ntohs(ptd->host.sin_port),
					       pt_login_callback,gc)) 
				gaim_connection_error(gc,_("Connection Failed."));
			}
			handled = TRUE;
		break;
		case PACKET_SERVER_KEY:
			if (ptd->serverkey) g_free(ptd->serverkey);
			ptd->serverkey = g_strdup(waitbuf+6);
			
			gaim_connection_update_progress(gc,_("Logging In"),3,5);
			pt_send_packet(ptd,PACKET_LOGIN);
			handled = TRUE;
		break;
		case PACKET_ECHO:
			pt_send_packet(ptd,PACKET_ECHO_RESPONSE,waitbuf,waitlen);
			handled = TRUE;
		break;
		case PACKET_SERVICE_URL:
			ctmp = g_strdup_printf("%s&uid=%ld&login_key=%ld",waitbuf+20,
					       ptd->uin,PACKET_GET_LONG(waitbuf,16));
			gaim_notify_uri(gc,ctmp);
			g_free(ctmp);
			handled = TRUE;
		break;
		case PACKET_FILE_XFER_REQUEST:
			ltmp = PACKET_GET_LONG(waitbuf,6);
			ctmp = strchr(waitbuf+14,'\n'); *ctmp = 0; ctmp++;
			pt_recv_file(gc,PACKET_GET_LONG(waitbuf,10),ctmp,ltmp,g_strdup(waitbuf+14));
			handled = TRUE;
		break;
		case PACKET_FILE_XFER_REFUSED:
			gaim_debug_misc("paltalk","Got FILE_XFER_REFUSED");
			if ((xfer = pt_find_xfer(ptd,PACKET_GET_LONG(waitbuf,10))))
				gaim_xfer_cancel_remote(xfer);
			handled = TRUE;
		break;
		case PACKET_FILE_XFER_ACCEPTED:
			memcpy(&intmp,waitbuf+16,4);
			pt_xfer_connect(ptd,PACKET_GET_LONG(waitbuf,10),inet_ntoa(intmp),
					PACKET_GET_SHORT(waitbuf,20));
			handled = TRUE;
		break;
		case PACKET_FILE_XFER_ERROR:
			gaim_debug_misc("paltalk","Got FILE_XFER_ERROR\n");
			if ((xfer = pt_find_xfer(ptd,PACKET_GET_LONG(waitbuf,10)))) {
				gaim_input_remove(((PTXferData *)(xfer->data))->inpa);
				((PTXferData *)(xfer->data))->inpa = -1;
				gaim_xfer_error(xfer->type,((PTXferData *)(xfer->data))->who,
						waitbuf+14);
				gaim_xfer_cancel_remote(xfer);
			}
			handled = TRUE;
		break;
		
		case PACKET_LOGIN_UNKNOWN:
		case PACKET_ROOM_UNKNOWN_ENCODED:
		case PACKET_EMAIL_VERIFICATION:
		case PACKET_UPGRADE:
		case PACKET_USER_STATUS:
		case PACKET_WM_MESSAGE:
		case PACKET_ROOM_BANNER_URL:
		case PACKET_INTEROP_URL:
		case PACKET_POPUP_URL:
		case PACKET_USER_DATA:
		case PACKET_ROOM_PREMIUM:
		case PACKET_USER_STATS:
			handled = TRUE;
		break;

	}

#ifdef DO_UNHANDLED
	if (!handled) pt_unknown_packet(waitbuf);
#endif
	g_free(waitbuf);
}
