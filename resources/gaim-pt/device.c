/**
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

#include "debug.h"
#include "config.h"
#include "device.h"
#include <sys/ioctl.h>
#include <dirent.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <glib.h>

#define HAVE_SYS_SOUNDCARD_H // This should work for most people.

#ifdef HAVE_SYS_SOUNDCARD_H
	#include <sys/soundcard.h>
#elif defined(HAVE_MACHINE_SOUNDCARD_H)
	#include <machine/soundcard.h>
#elif defined(HAVE_SOUNDCARD_H)
	#include <soundcard.h>
#endif

/**
 * OSS Driver
 * (C) 2005 Tim Hentenaar <tim@hentsoft.com>
 * 
 */

static GList *open_devs = NULL;

static gpointer oss_dev_write_thread(gpointer data)
{
	GaimMediaDeviceHandle *dev = data; GaimAudioFormat *fm = dev->format;
	long len; int e,fd,f=0; char *id = dev->handle; gpointer tmp;

	if (!id && dev->tmpp) id = dev->tmpp;
	if ((fd = open(id,O_WRONLY|O_NONBLOCK)) < 0) { // O_SYNC
		gaim_debug_error("OSS","Unable to open %s: %s!\n",id,strerror(errno));
		g_thread_exit(NULL);
	}

	if (!fm) {
		gaim_debug_error("OSS","You really should set the audio format.\n");
		g_thread_exit(NULL);
	}

	dev->tmpp   = id;
	dev->handle = (gpointer)0;

	/* Set Format */
	switch (fm->type) {
		case GAIM_AUDIO_UNSIGNED:
			switch (fm->bps/8) {
				#if __BYTE_ORDER == __LITTLE_ENDIAN
				case 1:    f = AFMT_U8;        break;
				case 2:    f = AFMT_U16_LE;    break;
				#else
				case 1:    f = AFMT_U8;        break;
				case 2:    f = AFMT_U16_BE;    break;
				#endif /* __BYTE_ORDER == __LITTLE_ENDIAN */
			}
			break;
		case GAIM_AUDIO_SIGNED:
			switch (fm->bps/8) {
				#if __BYTE_ORDER == __LITTLE_ENDIAN
				case 1:    f = AFMT_S8;        break;
				case 2:    f = AFMT_S16_LE;    break;
				#else
				case 1:    f = AFMT_S8;        break;
				case 2:    f = AFMT_S16_BE;    break;
				#endif /* __BYTE_ORDER == __LITTLE_ENDIAN */
			}
		break;
	}

	ioctl(fd,SNDCTL_DSP_SETFMT,&f);
	ioctl(fd,SNDCTL_DSP_CHANNELS,&fm->channels);
	ioctl(fd,SNDCTL_DSP_SPEED,&fm->rate);

	f = (fm->channels == 2 ? 1 : 0);
	ioctl(fd,SNDCTL_DSP_STEREO,&f);

	f = 1;
	ioctl(fd,SNDCTL_DSP_NONBLOCK,&f);

	while (dev->refc > 0 && !dev->paused) {
		while ((tmp = g_async_queue_try_pop(dev->buffers))) {
			len = *(long *)(tmp);
			if ((e = write(fd,tmp+4,len)) < 0) {
				gaim_debug_error("OSS","write(%d) failed: (%d) %s\n",fd,errno,
						 strerror(errno));
			}
			g_free(tmp);
		}
		usleep(1);	/* 0.0010 ms */
	}

	close(fd);
	usleep(2);
	g_thread_exit(NULL);
	return NULL;
}

static void oss_dev_destroy(GaimMediaDeviceHandle *h)
{
	if (h->pt)      g_thread_join(h->pt);
	if (h->format)  g_free(h->format);
	if (h->handle)  g_free(h->handle);
	if (h->tmpp)    g_free(h->tmpp);
	if (h->tmpi)    close(h->tmpi);
	
	if (h->buffers) {
		while ((h->tmpp = g_async_queue_try_pop(h->buffers))) g_free(h->tmpp);
		g_async_queue_unref(h->buffers);	
	}

	g_free(h);
}

/* Device Handle Functions */
static int oss_dev_read(gpointer handle, void *buffer, int len)
{
	GaimMediaDeviceHandle *dev; GaimAudioFormat *fm; int e, f, fd;

	g_return_val_if_fail(handle != NULL,-1);
	g_return_val_if_fail(buffer != NULL,-1);
	g_return_val_if_fail(len > 0,-1);
	
	dev = handle; fm = dev->format;

	if (!fm) {
		gaim_debug_error("OSS","You really should set the audio format.\n");
		return -1;
	}

	if (dev->handle && !dev->tmpp) dev->tmpp   = dev->handle;
	if (!dev->tmpi) {
		if ((fd = open(dev->tmpp,O_RDONLY | O_SYNC)) < 0) { 
			gaim_debug_misc("OSS","open(%s) for read failed: %s\n",dev->tmpp,strerror(errno));
			return -1;
		}
		dev->tmpi = fd;

		/* Set Format */
		switch (fm->type) {
			case GAIM_AUDIO_UNSIGNED:
				switch (fm->bps/8) {
					#if __BYTE_ORDER == __LITTLE_ENDIAN
					case 1:    f = AFMT_U8;        break;
					case 2:    f = AFMT_U16_LE;    break;
					#else
					case 1:    f = AFMT_U8;        break;
					case 2:    f = AFMT_U16_BE;    break;
					#endif /* __BYTE_ORDER == __LITTLE_ENDIAN */
				}
				break;
			case GAIM_AUDIO_SIGNED:
				switch (fm->bps/8) {
					#if __BYTE_ORDER == __LITTLE_ENDIAN
					case 1:    f = AFMT_S8;        break;
					case 2:    f = AFMT_S16_LE;    break;
					#else
					case 1:    f = AFMT_S8;        break;
					case 2:    f = AFMT_S16_BE;    break;
					#endif /* __BYTE_ORDER == __LITTLE_ENDIAN */
				}
			break;
		}

		ioctl(fd,SNDCTL_DSP_SETFMT,&f);
		ioctl(fd,SNDCTL_DSP_CHANNELS,&fm->channels);
		ioctl(fd,SNDCTL_DSP_SPEED,&fm->rate);
	
		f = (fm->channels == 2 ? 1 : 0);
		ioctl(fd,SNDCTL_DSP_STEREO,&f);
	} else { fd = dev->tmpi; }
	
	if ((e = read(fd,buffer,len)) < 0) 
		gaim_debug_misc("OSS","read(%d) failed: %s\n",fd,strerror(errno));
	return e;
}

static void oss_dev_pause(gpointer handle)
{
	GaimMediaDeviceHandle *dev; 
	g_return_if_fail(handle != NULL);
	
	dev = handle;
	dev->paused = dev->paused ? FALSE : TRUE;
	
	if (dev->paused && dev->pt) {
		g_thread_join(dev->pt);
		dev->pt = NULL;
	} else if (dev->paused && dev->tmpi) {
		close((int)dev->tmpi);
		dev->tmpi = 0;
	}
	
}

static int oss_dev_get_frame_size(gpointer handle)
{
	GaimMediaDeviceHandle *dev; GaimAudioFormat *fmt;
	g_return_val_if_fail(handle != NULL,-1);
	
	dev = handle; fmt = dev->format; if (!fmt) return -1;
	return fmt->rate * fmt->channels * (fmt->bps/8);
}

static int oss_dev_read_frames(gpointer handle, void **buffer, int frames, int s)
{
	GaimMediaDeviceHandle *dev = handle; int e,fs;

	g_return_val_if_fail(handle != NULL,-1);
	g_return_val_if_fail(buffer != NULL,-1);
	g_return_val_if_fail(frames > 0,-1);
	
	if (s) fs = s;
	else   fs = oss_dev_get_frame_size(dev); 
		
	if (!*buffer) *buffer = g_malloc(frames*fs);
	if ((e = oss_dev_read(handle,*buffer,frames*fs)) < 0) {
		g_free(*buffer);
		*buffer = NULL;
		return -1;
	}
	return e;
}

static void oss_dev_get_format(gpointer handle, void **fmtptr)
{
	GaimMediaDeviceHandle *dev;
	
	g_return_if_fail(fmtptr != NULL);
	if (!handle) { *(GaimAudioFormat **)fmtptr = NULL; return; }

	dev = handle;
	*(GaimAudioFormat **)fmtptr = (GaimAudioFormat *)dev->format;
}

static void oss_dev_set_format(gpointer handle, void *fmt)
{
	GaimAudioFormat *fm; GaimMediaDeviceHandle *dev; int f=-1;

	g_return_if_fail(handle != NULL);
	g_return_if_fail(fmt != NULL);

	fm = fmt; dev = handle;

	switch (fm->type) {
		case GAIM_AUDIO_UNSIGNED:
			switch (fm->bps/8) {
				#if __BYTE_ORDER == __LITTLE_ENDIAN
				case 1:    f = AFMT_U8;        break;
				case 2:    f = AFMT_U16_LE;    break;
				#else
				case 1:    f = AFMT_U8;        break;
				case 2:    f = AFMT_U16_BE;    break;
				#endif /* __BYTE_ORDER == __LITTLE_ENDIAN */
			}
			break;
		case GAIM_AUDIO_SIGNED:
			switch (fm->bps/8) {
				#if __BYTE_ORDER == __LITTLE_ENDIAN
				case 1:    f = AFMT_S8;        break;
				case 2:    f = AFMT_S16_LE;    break;
				#else
				case 1:    f = AFMT_S8;        break;
				case 2:    f = AFMT_S16_BE;    break;
				#endif /* __BYTE_ORDER == __LITTLE_ENDIAN */
			}
		break;
	}

	if (f == -1) {
		gaim_debug_error("OSS","Invalid audio format specified.\n");
		return;
	}

	if (dev->format) g_free(dev->format);
	dev->format = g_new0(GaimAudioFormat,1);
	memcpy(dev->format,fm,sizeof(GaimAudioFormat));
}

static void oss_dev_add_buffer(gpointer handle, void *buffer, ssize_t size)
{
	char *buf; GaimMediaDeviceHandle *dev;

	g_return_if_fail(handle != NULL);
	g_return_if_fail(buffer != NULL);
	g_return_if_fail(size > 0);

	dev = handle;
	buf = g_malloc(size+4);
	memcpy(buf,&size,4);
	memcpy(buf+4,buffer,size);
	if (!dev->buffers) dev->buffers = g_async_queue_new();
	g_async_queue_push(dev->buffers,buf);

	if (!dev->pt) 
		dev->pt = g_thread_create(oss_dev_write_thread,dev,TRUE,NULL);

	g_free(buffer);
}

static int oss_dev_write(gpointer handle, void *buffer, int len)
{
	g_return_val_if_fail(handle != NULL && buffer != NULL,-1);
	oss_dev_add_buffer(handle,buffer,len);
	return len;
}

static void oss_dev_unref(gpointer handle) 
{
	GaimMediaDeviceHandle *dev;
	g_return_if_fail(handle != NULL);
	
	dev = handle;
	if (dev->refc == 0) {
		oss_dev_destroy(dev);
		return;
	} else dev->refc--;
}

static void oss_dev_ref(gpointer handle)
{
	GaimMediaDeviceHandle *dev;
	g_return_if_fail(handle != NULL);
	
	dev = handle;
	dev->refc++;
}

/* Device Subsystem Functions */

static gpointer oss_open(char *id, guint mode)
{
	GaimMediaDeviceHandle *h; int fd,flags; 
	g_return_val_if_fail(id != NULL,NULL);

	flags = (mode & OPT_MEDIA_DEVICE_PLAYBACK) ? O_WRONLY : O_WRONLY;
	
	if ((fd = open(id,flags)) < 0) {
		gaim_debug_error("OSS","Unable to open %s: %s!\n",id,strerror(errno));
		return NULL;
	}
	close(fd);

	h                 = g_new0(GaimMediaDeviceHandle,1);
	h->handle         = (gpointer)g_strdup(id);
	h->refc           = 1;
	h->options        = mode | OPT_MEDIA_DEVICE_AUDIO;
	h->read           = oss_dev_read;
	h->read_frames    = oss_dev_read_frames;
	h->write          = oss_dev_write;
	h->get_format     = oss_dev_get_format;
	h->get_frame_size = oss_dev_get_frame_size;
	h->set_format     = oss_dev_set_format;
	h->add_buffer     = oss_dev_add_buffer;
	h->unref          = oss_dev_unref;
	h->ref            = oss_dev_ref;
	h->pause          = oss_dev_pause;
	
	open_devs = g_list_append(open_devs,h);

	if(!g_thread_supported()) g_thread_init(NULL);
	return h;
}

static void oss_close(gpointer handle)
{
	GaimMediaDeviceHandle *h; 
	g_return_if_fail(handle != NULL);

	h = handle;
	if (h->refc > 0) { oss_dev_unref(h); return; }
	oss_dev_destroy(h);
}

static void oss_uninit()
{
	/* Cleanup any unclosed devs to prevent memory leaks */
	GList *ltmp;

	for (ltmp=open_devs;ltmp;ltmp=ltmp->next) {
		if (ltmp->data) {
			((GaimMediaDeviceHandle *)(ltmp->data))->refc = 0;
			oss_close(ltmp->data);
		}
	}
}

static GaimMediaDevice oss_dev_info = 
{
	OPT_MEDIA_DEVICE_AUDIO | OPT_MEDIA_DEVICE_RECORD | OPT_MEDIA_DEVICE_PLAYBACK,
	NULL,						/**< init             */
	NULL,						/**< enumerate        */
	oss_open,					/**< open             */
	oss_close,					/**< close            */
	oss_uninit					/**< uninit           */
};


GaimMediaDeviceHandle *gaim_device_open(guint dir, guint av)
{
	char *id; GaimMediaDeviceHandle *h; FILE *fp;

	if (!(fp = fopen("/dev/sound/dsp","r"))) {
		if (!(fp = fopen("/dev/dsp","r"))) {
			if (!(fp = fopen("/dev/dsp0","r"))) {
				if (!(fp = fopen("/dev/dsp1","r"))) {
					gaim_debug_error("device","You're shit out of luck for sound. Unable to find a useable device.\n");
					return NULL;
				} else id = g_strdup("/dev/dsp1");
			} else id = g_strdup("/dev/dsp0");
		} else id = g_strdup("/dev/dsp");
	} else id = g_strdup("/dev/sound/dsp");
	
	fclose(fp);
	
	if (!(h = oss_dev_info.open(id,dir))) {
		gaim_debug_misc("device","dev->open() failed for %s\n",id);
		g_free(id);
		return NULL;
	}
	gaim_debug_misc("device","gaim_device_open(): opened %s: %p\n",id,h);

	g_free(id);
	return h;
}

