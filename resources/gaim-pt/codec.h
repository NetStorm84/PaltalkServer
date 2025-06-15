/**
 * @file codec.h Codec API
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
#ifndef _GAIM_CODEC_H
#define _GAIM_CODEC_H

typedef struct _GaimCodecInfo    GaimCodec;
typedef enum   _GaimCodecOptions GaimCodecOptions;

/**
 * Codec Flags
 */
enum _GaimCodecOptions
{
	OPT_CODEC_AUDIO  = 0x00000001,	/**< This is an audio codec.   */
	OPT_CODEC_VIDEO  = 0x00000002   /**< This is a video codec.    */
};

/**
 * Codec plugin information structure.
 *
 * Every codec must have its own instance of this structure. 
 * This is the key link between gaim and the codec.
 */
struct _GaimCodecInfo
{
	GaimCodecOptions options;	/**< Codec options              */
	void *encode_data;		/**< Codec-specific encode data */
	void *decode_data;		/**< Codec-specific decode data */
	void (*init)();	
	void (*get_format)(void **format);
	int  (*get_frame_size)(gboolean encoded);
	int  (*encode)(GaimCodec *codec, void *in, char **out);
	int  (*decode)(GaimCodec *codec, void *in, char **out);
	void (*uninit)(GaimCodec *codec);
};	

#endif	/* _GAIM_CODEC_H */
