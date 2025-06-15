/**
 * @file mediastream.h Media Stream API
 * @ingroup core
 * 
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
 */
#ifndef _GAIM_MEDIASTREAM_H
#define _GAIM_MEDIASTREAM_H

#include "account.h"

typedef struct _GaimMediaStream           GaimMediaStream;
typedef struct _GaimMediaStreamUiOps      GaimMediaStreamUiOps;
typedef enum   _GaimMediaStreamDirection  GaimMediaStreamDirection;
typedef enum   _GaimMediaStreamType       GaimMediaStreamType;
typedef enum   _GaimMediaStreamStatusType GaimMediaStreamStatusType;

/**
 * Directions of media streams.
 */
enum _GaimMediaStreamDirection
{
	GAIM_MEDIA_STREAM_DIRECTION_UNKNOWN = 0,  /**< Unknown media stream direction.  */
	GAIM_MEDIA_STREAM_DIRECTION_SEND,         /**< Transmitting.                    */
	GAIM_MEDIA_STREAM_DIRECTION_RECEIVE,      /**< Receiving.                       */
	GAIM_MEDIA_STREAM_DIRECTION_BOTH	  /**< Both.                            */
};

/**
 * Types of media streams.
 */
enum _GaimMediaStreamType
{
	GAIM_MEDIA_STREAM_UNKNOWN = 0,		/**< Unknown media stream type.         */
	GAIM_MEDIA_STREAM_AUDIO,                /**< Audio Stream                       */
	GAIM_MEDIA_STREAM_VIDEO			/**< Video Stream                       */
};

/**
 * The different states of the stream.
 */
enum _GaimMediaStreamStatusType
{
	GAIM_MEDIA_STREAM_STATUS_UNKNOWN     = 0,  /**< Unknown, the stream may be null.         */
	GAIM_MEDIA_STREAM_STATUS_PAUSED      = 1,  /**< It's been paused.                        */
	GAIM_MEDIA_STREAM_STATUS_NOT_STARTED = 2,  /**< It hasn't started yet.                   */
	GAIM_MEDIA_STREAM_STATUS_ACCEPTED    = 4,  /**< It's been accepted                       */
	GAIM_MEDIA_STREAM_STATUS_STARTED     = 8,  /**< gaim_media_stream_start has been called. */
	GAIM_MEDIA_STREAM_CANCEL_LOCAL       = 16, /**< We cancelled the stream.                 */
	GAIM_MEDIA_STREAM_CANCEL_REMOTE	     = 32  /**< The other end cancelled the stream.      */
};

/**
 * Media stream UI operations.
 *
 * Any UI representing a media stream must assign a filled-out
 * GaimMediaStreamUiOps structure to the stream.
 */
struct _GaimMediaStreamUiOps 
{
	void (*new_stream)(GaimMediaStream *stream);
	void (*destroy)(GaimMediaStream *stream);
	void (*cancel_local)(GaimMediaStream *stream);
	void (*cancel_remote)(GaimMediaStream *stream);
	void (*draw_video_frame)(GaimMediaStream *stream, void *frame, int size);
};

/**
 * The core representation of a media stream.
 */
struct _GaimMediaStream
{
	guint ref;				/**< The reference count                */
	GaimMediaStreamType type;		/**< The type of stream                 */
	GaimMediaStreamDirection dir;		/**< The direction of the stream        */
	GaimMediaStreamStatusType status;	/**< Status of the stream               */
	char *codec_type;			/**< The codec type (@see codec.h)      */
	int local_port;				/**< The local port                     */
	int remote_port;			/**< The remote port                    */
	char *remote_ip;			/**< The remote IP                      */
	int sock;				/**< The socket file descriptor         */
	int watcher;				/**< Watcher for the socket             */
	int frames;				/**< Number of frames to send at a time */
	GaimAccount *a;				/**< Local account                      */
	char *who;				/**< Person on the other end            */
	char *message;				/**< Message for request dialogs        */
	int   w_throttle;			/**< Time between packets (ms)          */
	GThread *w_thread;                      /**< Write timer                        */
	gboolean m_req;				/**< TRUE if we're requesting the mic   */
	gboolean do_write;			/**< TRUE if we should be capturing     */
	
	struct	/* I/O Operations */
	{
		void (*init)(GaimMediaStream *stream);
		void (*start)(GaimMediaStream *stream);
		void (*end)(GaimMediaStream *stream);
		void (*request_denied)(GaimMediaStream *stream);
		void (*cancel_send)(GaimMediaStream *stream);
		void (*cancel_recv)(GaimMediaStream *stream);
		ssize_t (*read)(GaimMediaStream *stream, char **buffer, int s);
		ssize_t (*write)(GaimMediaStream *stream, const char **buffers, size_t size);
		void (*ack)(GaimMediaStream *stream, const char *buffer, size_t size);
		void (*req_mic)(GaimMediaStream *stream);
	} ops;

	GaimMediaStreamUiOps *ui_ops;		/**< UI Ops                             */
	gpointer data;				/**< Protocol-specific data             */
	gpointer codec;				/**< Codec Handle                       */
	gpointer format;			/**< The media format                   */
	gpointer device;			/**< Device Handle                      */
	gpointer vidhandle;			/**< UI Video Window Handle             */
};

#ifdef __cplusplus
extern "C" {
#endif

/**************************************************************************/
/** @name Media Streaming API                                             */
/**************************************************************************/
/*@{*/

/**
 * Creates a new media stream handle.
 * This is called by prpls.
 * The handle starts with a ref count of 1, and this reference
 * is owned by the core. The prpl normally does not need to
 * gaim_media_stream_ref or unref.
 *
 * You may pass NULL for mime to use raw media data.
 *
 * @param account The account sending or receiving the stream.
 * @param type    The type of media stream.
 * @param who     The name of the remote user.
 * @param mime    MIME type of the media stream. (@see codec.h)
 * @return A media stream handle.
 */
GaimMediaStream *gaim_media_stream_new(GaimAccount *account,GaimMediaStreamType type,
				       const char *who, const char *mime);

/**
 * Increases the reference count on a GaimMediaStream.
 * Please call gaim_media_stream_unref later.
 *
 * @param stream A media stream handle.
 */
void gaim_media_stream_ref(GaimMediaStream *stream);

/**
 * Decreases the reference count on a GaimMediaStream.
 * If the reference reaches 0, gaim_media_stream_destroy (an internal function)
 * will destroy the stream. It calls the ui destroy cb first.
 * Since the core keeps a ref on the stream, only an erroneous call to
 * this function will destroy the stream while still in use.
 *
 * @param stream A media stream handle.
 */
void gaim_media_stream_unref(GaimMediaStream *stream);

/**
 * Requests confirmation for a media stream from the user. If receiving
 * a file which is known at this point, this requests user to accept and
 * save the file. If the filename is unknown (not set) this only requests user
 * to accept the media stream. In this case protocol must call this function
 * again once the filename is available.
 *
 * @param stream The media stream to request confirmation on.
 */
void gaim_media_stream_request(GaimMediaStream *stream);

/**
 * [Un]Pauses the media stream. The device will stay open, but this
 * stream won't transmit audio data to the device until unpaused.
 *
 * @param stream The media stream to [un]pause.
 */
void gaim_media_stream_pause(GaimMediaStream *stream);

/**
 * Called if the user accepts the media stream request.
 *
 * @param stream     The media stream.
 */
void gaim_media_stream_request_accepted(GaimMediaStream *stream);

/**
 * Called if the user rejects the media stream request.
 *
 * @param stream The media stream.
 */
void gaim_media_stream_request_denied(GaimMediaStream *stream);

/**
 * Returns the type of media stream.
 *
 * @param stream The media stream.
 * @return The type of the media stream.
 */
GaimMediaStreamType gaim_media_stream_get_type(const GaimMediaStream *stream);

/**
 * Returns the account the media stream is using.
 *
 * @param stream The media stream.
 * @return The account.
 */
GaimAccount *gaim_media_stream_get_account(const GaimMediaStream *stream);

/**
 * Returns the status of the stream.
 *
 * @param stream The media stream.
 * @return The status.
 */
GaimMediaStreamStatusType gaim_media_stream_get_status(const GaimMediaStream *stream);

/**
 * Returns true if the media stream was canceled.
 *
 * @param stream The media stream.
 * @return Whether or not the transfer was canceled.
 */
gboolean gaim_media_stream_is_canceled(const GaimMediaStream *stream);

/**
 * Returns the local port number in the media stream.
 *
 * @param stream The media stream.
 * @return The port number on this end.
 */
int gaim_media_stream_get_local_port(const GaimMediaStream *stream);

/**
 * Returns the remote IP address in the media stream.
 *
 * @param stream The media stream.
 * @return The IP address on the other end.
 */
const char *gaim_media_stream_get_remote_ip(const GaimMediaStream *stream);

/**
 * Returns the remote port number in the media stream.
 *
 * @param stream The media stream.
 * @return The port number on the other end.
 */
int gaim_media_stream_get_remote_port(const GaimMediaStream *stream);

/**
 * Returns the UI operations structure for a media stream.
 *
 * @param stream The media stream.
 * @return The UI operations structure.
 */
GaimMediaStreamUiOps *gaim_media_stream_get_ui_ops(const GaimMediaStream *stream);

/**
 * Sets the read function for the media stream.
 *
 * @param stream The media stream.
 * @param fnc  The read function.
 */
void gaim_media_stream_set_read_fnc(GaimMediaStream *stream,
				    ssize_t (*fnc)(GaimMediaStream *,char **, int));

/**
 * Sets the write function for the media stream.
 *
 * @param stream The media stream.
 * @param fnc  The write function.
 */
void gaim_media_stream_set_write_fnc(GaimMediaStream *stream,
		                     ssize_t (*fnc)(GaimMediaStream *,const char **, size_t));

/**
 * Sets the acknowledge function for the media stream.
 *
 * @param stream The media stream.
 * @param fnc  The acknowledge function.
 */
void gaim_media_stream_set_ack_fnc(GaimMediaStream *stream,
				   void (*fnc)(GaimMediaStream *, const char *, size_t));

/**
 * Sets the function to be called if the request is denied.
 *
 * @param stream The media stream.
 * @param fnc The request denied prpl callback.
 */
void gaim_media_stream_set_request_denied_fnc(GaimMediaStream *stream,
		                              void (*fnc)(GaimMediaStream *));

/**
 * Sets the transfer initialization function for the media stream.
 *
 * This function is required, and must call gaim_media_stream_start() with
 * the necessary parameters. This will be called if the media stream
 * is accepted by the user.
 *
 * @param stream The media stream.
 * @param fnc  The transfer initialization function.
 */
void gaim_media_stream_set_init_fnc(GaimMediaStream *stream, void (*fnc)(GaimMediaStream *));

/**
 * Sets the start transfer function for the media stream.
 *
 * @param stream The media stream.
 * @param fnc  The start transfer function.
 */
void gaim_media_stream_set_start_fnc(GaimMediaStream *stream, void (*fnc)(GaimMediaStream *));

/**
 * Sets the end transfer function for the media stream.
 *
 * @param stream The media stream.
 * @param fnc  The end transfer function.
 */
void gaim_media_stream_set_end_fnc(GaimMediaStream *stream, void (*fnc)(GaimMediaStream *));

/**
 * Sets the cancel send function for the media stream.
 *
 * @param stream The media stream.
 * @param fnc  The cancel send function.
 */
void gaim_media_stream_set_cancel_send_fnc(GaimMediaStream *stream, void (*fnc)(GaimMediaStream *));

/**
 * Sets the cancel receive function for the media stream.
 *
 * @param stream The media stream.
 * @param fnc  The cancel receive function.
 */
void gaim_media_stream_set_cancel_recv_fnc(GaimMediaStream *stream, void (*fnc)(GaimMediaStream *));

/**
 * Reads in data from a media stream stream.
 *
 * @param stream   The media stream.
 * @param buffer The buffer that will be created to contain the data.
 * @return The number of bytes read, or -1.
 */
ssize_t gaim_media_stream_read(GaimMediaStream *stream, char **buffer);

/**
 * Kicks off the write throttle timer.
 * This must be called before gaim_media_stream_write.
 *
 * @param stream The media stream.
 */
void gaim_media_stream_start_write(GaimMediaStream *stream);

/**
 * Writes data to a media stream stream.
 *
 * @param stream   The media stream.
 * @param buffers  The buffers to read the data from.
 * @param n        The number of buffers
 * @param s        The frame size
 * @return The number of bytes written, or -1.
 */
ssize_t gaim_media_stream_write(GaimMediaStream *stream, const char **buffers, size_t n, size_t s);

/**
 * Starts a media stream.
 *
 * Either @a fd must be specified <i>or</i> @a ip and @a port on a
 * file receive transfer. On send, @a fd must be specified, and
 * @a ip and @a port are ignored.
 *
 * @param stream The media stream.
 * @param fd   The file descriptor for the socket.
 * @param ip   The IP address to connect to.
 * @param port The port to connect to.
 */
void gaim_media_stream_start(GaimMediaStream *stream, int fd, const char *ip, unsigned int port);

/**
 * Ends a media stream.
 *
 * @param stream The media stream.
 */
void gaim_media_stream_end(GaimMediaStream *stream);

/**
 * Cancels a media stream on the local end.
 *
 * @param stream The media stream.
 */
void gaim_media_stream_cancel_local(GaimMediaStream *stream);

/**
 * Cancels a media stream from the remote end.
 *
 * @param stream The media stream.
 */
void gaim_media_stream_cancel_remote(GaimMediaStream *stream);

/**
 * Displays a media stream-related error message.
 *
 * This is a wrapper around gaim_notify_error(), which automatically
 * specifies a title ("Media stream to <i>user</i> aborted" or
 * "Media stream from <i>user</i> aborted").
 *
 * @param type The type of media stream.
 * @param who  The user on the other end of the transfer.
 * @param msg  The message to display.
 */
void gaim_media_stream_error(GaimMediaStream *stream, GaimMediaStreamDirection dir, const char *who,
		             const char *msg);

/**************************************************************************/
/** @name UI Registration Functions                                       */
/**************************************************************************/
/*@{*/

/**
 * Sets the UI operations structure to be used in all gaim media streams.
 *
 * @param ops The UI operations structure.
 */
void gaim_media_streams_set_ui_ops(GaimMediaStreamUiOps *ops);

/**
 * Returns the UI operations structure to be used in all gaim media streams.
 *
 * @return The UI operations structure.
 */
GaimMediaStreamUiOps *gaim_media_streams_get_ui_ops();

/*@}*/

#ifdef __cplusplus
}
#endif

#endif	/* _GAIM_MEDIASTREAM_H */
