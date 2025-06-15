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
#include "ft.h"

gboolean pt_can_receive_file(GaimConnection *gc, const char *who) 
{ 
	return TRUE; 
}

gpointer pt_find_xfer(PTData *data, long id) 
{
	GList *tmp; GaimXfer *x; PTXferData *xd;
	
	for (tmp=data->xfers;tmp;tmp=tmp->next) {
		x = tmp->data; xd = x->data;
		if (xd->id == 0 && gaim_xfer_get_type(x) == GAIM_XFER_SEND)  {
			xd->id = id; 
			return x;
		}
		if (xd->id == id) return x;
	}
	return NULL;
}

static void pt_xfer_connected(gpointer data, int source, GaimInputCondition cond) 
{
	GaimXfer *xfer; PTXferData *xd;
	char inbuf[256], nick[255],fn[255],*outbuf; int br,ufrom,uto;

	/* Once the transfer request is accepted, and we've connected to the server,
	 * we have to "authorize" so that we can receive the file.
	 *
	 * The first thing we should get is "CONNECT" 0x09 "OK\n"
	 */
	
	g_return_if_fail(data && ((GaimXfer *)data)->data);
	
	xfer = data; 
	xd   = xfer->data;

	if (xd->inpa == -1) return;
	
	memset(inbuf,0,256);
	if (source < 0 || (br = read(source,inbuf,255)) < 0) {
		if (xd->inpa) gaim_input_remove(xd->inpa); 
		xd->fd = -1; xd->inpa = -1; 
		gaim_xfer_cancel_remote(xfer); 
		close(source);
		return;
	} else if (xd->fd != source) xd->fd = source;
	xd->inpa = gaim_input_add(source,GAIM_INPUT_READ,pt_xfer_connected,xfer);

	if (inbuf[0] == 0) {
		if (xd->inpa) gaim_input_remove(xd->inpa);
		xd->fd = -1; xd->inpa = -1;
		gaim_xfer_cancel_remote(xfer);
		return;
	}

	if (!xd->phase && strncmp(inbuf,"CONNECT\x09OK\n",11)) {
		close(source);
		gaim_xfer_cancel_remote(xfer);
		if (xd->inpa) gaim_input_remove(xd->inpa);
		xd->fd = -1; xd->inpa = -1;
		return;
	} else if (!xd->phase) {
		xd->fd    = source;
		xd->phase = 1;
		outbuf = g_strdup_printf("INTRO\x09%ld\x09%ld\n",xd->data->uin,xd->id);
		write(source,outbuf,strlen(outbuf));
		g_free(outbuf);
		return;
	}

	/* Now, if everything goes OK, we'll get "AUTH" 0x09 "OK\n" */
	if (xd->phase == 1 && strncmp(inbuf,"AUTH\x09OK\n",8)) {
		close(source); 
		gaim_xfer_cancel_remote(xfer);
		if (xd->inpa) gaim_input_remove(xd->inpa);
		xd->fd = -1; xd->inpa = -1;
		return;
	} else xd->phase = 2;
	
	if (gaim_xfer_get_type(xfer) == GAIM_XFER_SEND && !strncmp(inbuf,"SEND\x09OK\n",8)) {
		/* Now we send the basic stats for our file */
		outbuf = g_strdup_printf("SEND\x09%ld\x09%ld\x09%s\x09%d\x09%s\n",
					 xd->data->uin,xd->uin,xd->who,gaim_xfer_get_size(xfer),
					 xfer->filename);
		write(source,outbuf,strlen(outbuf));
		g_free(outbuf);
		
		/* Now we send the actual file */
		gaim_input_remove(xd->inpa); xd->inpa = -1;
		gaim_xfer_start(xfer,source,NULL,0);
		return;
	} 

	if (gaim_xfer_get_type(xfer) == GAIM_XFER_RECEIVE && !strncmp(inbuf,"SEND",4)) {
		/* Now we get the basic stats for the file */
		gaim_input_remove(xd->inpa); xd->inpa = -1;
		if (sscanf(inbuf,"SEND\x09%d\x09%d\x09%s\x09%d\x09%s\n",&ufrom,&uto,nick,&br,fn)) {
			gaim_xfer_set_size(xfer,br);
			gaim_xfer_start(xfer,source,NULL,0);
		}
	} 

}

static ssize_t pt_xfer_write(const char *buffer, size_t size, GaimXfer *xfer) 
{
	PTXferData *xd = xfer->data; ssize_t len;
	
	if (!xd || gaim_xfer_get_type(xfer) != GAIM_XFER_SEND) return -1;
	
	if ((len = write(xfer->fd,buffer,size)) == -1) {
		if (gaim_xfer_get_bytes_sent(xfer) >= gaim_xfer_get_size(xfer))
			gaim_xfer_set_completed(xfer, TRUE);
		if ((errno != EAGAIN) && (errno != EINTR)) return -1;
		return 0;
	}
	
	if ((gaim_xfer_get_bytes_sent(xfer) + len) >= gaim_xfer_get_size(xfer)) 
		gaim_xfer_set_completed(xfer, TRUE);	
	return len;
}

static ssize_t pt_xfer_read(char **buffer, GaimXfer *xfer) 
{
	PTXferData *xd = xfer->data; char buf[4096]; ssize_t len;

	if (!xd || gaim_xfer_get_type(xfer) != GAIM_XFER_RECEIVE) return 0;

	len = read(xfer->fd, buf, 4096);

	if (len <= 0) {
		if ((gaim_xfer_get_size(xfer) > 0) &&
		    (gaim_xfer_get_bytes_sent(xfer) >= gaim_xfer_get_size(xfer))) {
			gaim_xfer_set_completed(xfer, TRUE);
			return 0;
		} else return -1;
	}

	/* Copy the data over */
	*buffer = g_malloc(len);
	memcpy(*buffer,buf,len);
	return len;
}

void pt_xfer_destroy(GaimXfer *xfer) 
{
	PTXferData *xd = xfer->data;
	
	if (xd) {
		if (xd->inpa) gaim_input_remove(xd->inpa);
		g_free(xd->who);
		g_free(xd);
		xd->data->xfers = g_list_remove(xd->data->xfers,xfer);
		if (g_list_length(xd->data->xfers) == 0) xd->data->xfers = NULL;
	}
}


/* Called after the user selects a file */
static void pt_send_init(GaimXfer *xfer) 
{
	PTXferData *xd; 
	
	xd              = xfer->data; 
	xfer->filename  = g_path_get_basename(xfer->local_filename);
	xd->data->xfers = g_list_append(xd->data->xfers,xfer);	
	xd->filename    = xfer->filename;

	pt_send_packet(xd->data,PACKET_FILE_XFER_SEND_INIT,xd);
}

/* Called after the user clicks "Send File" */
void pt_send_file(GaimConnection *gc, const char *who, const char *filename) 
{ 
	PTXferData *xd; GaimXfer *xfer; 
	
	/* Setup the transfer data    */
	xd      = g_new0(PTXferData,1); xd->fd = -1; xd->data = gc->proto_data;

	if (!g_ascii_isdigit(*who)) {
		xd->who = pt_get_cb_real_name(gc,-1,who);
		xd->uin = atol(xd->who);
		g_free(xd->who);
		xd->who = g_strdup(who);
	} else {
		xd->uin = atol(who); 
		xd->who = pt_get_cb_real_name(gc,-1,who);	
	}

	/* Setup the Transfer and Transfer I/O functions */
	xfer = gaim_xfer_new(gaim_connection_get_account(gc),GAIM_XFER_SEND,xd->who); 
	xfer->data = xd;
	gaim_xfer_set_init_fnc(xfer,pt_send_init);
	gaim_xfer_set_write_fnc(xfer,pt_xfer_write);
	gaim_xfer_set_end_fnc(xfer,pt_xfer_destroy);
	gaim_xfer_set_request_denied_fnc(xfer,pt_xfer_destroy);
	gaim_xfer_set_cancel_send_fnc(xfer,pt_xfer_destroy);
	
	/* Git 'r Done!            */
	if (filename) gaim_xfer_request_accepted(xfer,filename);
	else  	      gaim_xfer_request(xfer);	
}

static void pt_recv_init(GaimXfer *xfer) 
{
	PTXferData *xd = xfer->data; 
	
	pt_send_packet(xd->data,PACKET_FILE_XFER_RECV_INIT,xd);
}

static void pt_recv_reject(GaimXfer *xfer) 
{
	PTXferData *xd  = xfer->data; 
	xd->data->xfers = g_list_remove(xd->data->xfers,xfer);
	
	pt_send_packet(xd->data,PACKET_FILE_XFER_REJECT,xd);
}

void pt_recv_file(GaimConnection *gc, long id, char *from, long uin, char *fn) 
{
	PTXferData *xd; GaimXfer *xfer; char *u8fn;

	/* Setup the Transfer */
	xfer    = gaim_xfer_new(gaim_connection_get_account(gc),GAIM_XFER_RECEIVE,from);
	xd      = g_new0(PTXferData,1); xd->fd = -1; xd->data = gc->proto_data; xd->id = id; 
	xd->uin = uin; xd->who = g_strdup(from); xfer->data = xd; 

	/* Convert the filename to valid UTF-8 */
	u8fn = g_filename_to_utf8(fn,-1,NULL,NULL,NULL);
	gaim_xfer_set_filename(xfer,u8fn);
	g_free(u8fn);	

	/* Set the Callbacks */
	gaim_xfer_set_init_fnc(xfer,pt_recv_init);
	gaim_xfer_set_request_denied_fnc(xfer,pt_recv_reject);
	gaim_xfer_set_read_fnc(xfer,pt_xfer_read);
	gaim_xfer_set_cancel_send_fnc(xfer,pt_xfer_destroy);
	gaim_xfer_set_end_fnc(xfer,pt_xfer_destroy);
	
	/* Prompt the user    */
	xd->data->xfers = g_list_append(xd->data->xfers,xfer);
	gaim_xfer_request(xfer);
	return;
}

void pt_xfer_connect(PTData *data, long id, const char *ip, short port) 
{	
	GaimXfer *xfer; 

	if (!(xfer = pt_find_xfer(data,id))) return;
	
	if (gaim_xfer_get_type(xfer) == GAIM_XFER_SEND) {
		if (gaim_proxy_connect(data->a,ip,port,pt_xfer_connected,xfer) == -1) {
			data->xfers = g_list_remove(data->xfers,xfer);
			gaim_xfer_error(GAIM_XFER_SEND,xfer->who,_("Unable to connect!"));
			gaim_xfer_cancel_remote(xfer);
			return;
		}
	} else {
		if (gaim_proxy_connect(data->a,ip,port,pt_xfer_connected,xfer) == -1) {
			data->xfers = g_list_remove(data->xfers,xfer);
			gaim_xfer_error(GAIM_XFER_RECEIVE,xfer->who,_("Unable to connect!"));
			gaim_xfer_cancel_remote(xfer);
			return;
		}
	}		
}

