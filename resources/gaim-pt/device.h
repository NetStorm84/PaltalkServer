/**
 * @file device.h Media Device API
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
#ifndef _GAIM_MEDIA_DEVICE_H
#define _GAIM_MEDIA_DEVICE_H

#include "internal.h"
#include "version.h"

typedef struct _GaimEnumeratedDevice     GaimEnumeratedDevice;
typedef struct _GaimMediaDeviceHandle    GaimMediaDeviceHandle;
typedef struct _GaimMediaDeviceInfo      GaimMediaDevice;
typedef enum   _GaimMediaDeviceOptions   GaimMediaDeviceOptions;
typedef struct _GaimAudioFormat          GaimAudioFormat;
typedef struct _GaimVideoFormat	         GaimVideoFormat;
typedef enum   _GaimVideoPixelFormatType GaimVideoPixelFormatType;
typedef enum   _GaimAudioPCMFormatType   GaimAudioPCMFormatType;

/**
 * This represents the pixel format we want to capture in
 */
enum _GaimVideoPixelFormatType
{
	GAIM_VIDEO_UNKNOWN = 0,	/**< Unknown Format   */
	GAIM_VIDEO_GREYSCALE,	/**< Linear Greyscale */
	GAIM_VIDEO_RGB24,	/**< 24-bit RGB       */
	GAIM_VIDEO_RGB32,	/**< 32-bit RGB       */
	GAIM_VIDEO_YUYV,	/**< YUYV             */
	GAIM_VIDEO_UYVY,	/**< UYVY             */
	GAIM_VIDEO_YUV420,	/**< YUV 4:2:0 Planar */	
	GAIM_VIDEO_YUV422,	/**< YUV 4:2:2 Planar */
	GAIM_VIDEO_YUV410,	/**< YUV 4:1:0 Planar */
	GAIM_VIDEO_YUV411	/**< YUV 4:1:1 Planar */
};

/**
 * This represents the PCM audio format we want to capture in.
 *
 * Notes: Endian-ness is the default system endian-ness.
 */
enum _GaimAudioPCMFormatType
{
	GAIM_AUDIO_UNSIGNED = 0,	/**< Raw Unsigned     */
	GAIM_AUDIO_SIGNED		/**< Raw Signed       */
};

/**
 * This represents the video format we want to captrure in.  
 */
struct _GaimVideoFormat 
{
	GaimVideoPixelFormatType type;	/**< Pixel format                       */
	long width;			/**< Width of capture  (in pixels)      */
	long height;			/**< Height of capture (in pixels)      */
	long brightness;		/**< Brightness control                 */
	long hue;			/**< Hue control                        */
	long colour;			/**< Color control                      */
	long contrast;			/**< Contrast control                   */
	long whiteness;			/**< Whiteness control                  */
};

/**
 * This represents the audio format we want to capture in 
 */
struct _GaimAudioFormat
{
	GaimAudioPCMFormatType type;	/**< PCM format                        */
	long rate;			/**< The capture rate (Hz)             */
	long spc;			/**< Samples per second                */
	int bps;			/**< Bits per sample                   */
	int channels;			/**< Number of audio channels          */
};

/**
 * Device Flags
 */
enum _GaimMediaDeviceOptions
{
	OPT_MEDIA_DEVICE_AUDIO    = 0x00000001,	  /**< This is an audio device.   */
	OPT_MEDIA_DEVICE_VIDEO    = 0x00000002,   /**< This is a video device.    */
	OPT_MEDIA_DEVICE_RECORD   = 0x00000004,   /**< This is a record device.   */
	OPT_MEDIA_DEVICE_PLAYBACK = 0x00000008    /**< This is a playback device  */
};

/**
 * This represents an enumerated device.
 */
struct _GaimEnumeratedDevice
{
	char *id;			/**< Device ID           */
	char *desc;			/**< Device Description  */
	char *driver_id;		/**< Driver ID           */
};

/**
 * This represents a handle to a device.
 */
struct _GaimMediaDeviceHandle
{
	GaimMediaDeviceOptions options; /**< Device Options                   */
	guint       refc;		/**< Refrerence Count                 */
	gpointer    format;		/**< Media format                     */
	gpointer    handle;		/**< Struct or fd                     */
	GAsyncQueue *buffers;		/**< Media buffers                    */
	GThread     *pt;		/**< Player thread                    */	
	gboolean    paused;		/**< True if paused                   */
	gpointer    tmpp;
	guint       tmpi;
	int      (*read)(gpointer handle, void *buffer, int len);
	int      (*read_frames)(gpointer handle, void **buffer, int frames,int fsize); /* Convience */
	int      (*write)(gpointer handle, void *buffer, int len); /* Just in case... */
	void     (*get_format)(gpointer handle, void **fmtptr);
	int      (*get_frame_size)(gpointer handle);
	void     (*set_format)(gpointer handle, void *fmt);
	void     (*add_buffer)(gpointer handle, void *buffer, ssize_t size);
	void     (*unref)(gpointer handle);
	void     (*ref)(gpointer handle);
	void     (*pause)(gpointer handle);
};

/**
 * Media device plugin information structure.
 *
 * Every media device plugin must have its own instance of this structure. 
 * This is the key link between gaim and the devices.
 */
struct _GaimMediaDeviceInfo
{
	GaimMediaDeviceOptions options;	/**< Device Manager options           */
	void     (*init)();	
	void     (*enumerate)(GList **list,guint mode);
	gpointer (*open)(char *id, guint mode);	/* id (e.g. "/dev/sound/dsp" || "hw:0,0") */
	void     (*close)(gpointer handle);
	void     (*uninit)();
};	

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Opens the default device of the specified type.
 *
 * @param dir Either OPT_MEDIA_DEVICE_PLAYBACK or OPT_MEDIA_DEVICE_RECORD
 * @param av  Either OPT_MEDIA_DEVICE_AUDIO    or OPT_MEDIA_DEVICE_VIDEO
 * @return A handle to the device.
 */
GaimMediaDeviceHandle *gaim_device_open(guint dir, guint av);

#ifdef __cplusplus
}
#endif
#endif	/* _GAIM_MEDIA_DEVICE_H */
