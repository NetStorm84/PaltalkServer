/**
 * @file media.c RTP Packet Parsing API
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
#ifndef _GAIM_RTP_H
#define _GAIM_RTP_H

typedef struct rtp_packet    RTPPacket;

struct rtp_packet 
{
	int   version:2;	     /**< Version Number (allways 2)         */
	int   padding:1;	     /**< Padding Bit                        */
	int   extension:1; 	     /**< Extension Bit                      */
	int   csrc_count:4;	     /**< Number of contributing sources     */
	int   marker:1;		     /**< Marker bit			     */
	int   payload_type:7;	     /**< Payload Type                       */
	unsigned short sequence;     /**< Sequence (starts random)           */
	unsigned long  timestamp;    /**< Timestamp (starts random) [NTP-fmt]*/
	unsigned long  ssrc;         /**< Sync source  		             */
	unsigned long  *csrc;	     /**< Contributing Sources: 0 - 15 items */
	char *payload;
	short payload_len;
};

RTPPacket *rtp_packet_parse(char *packet, long packet_len);
void rtp_packet_destroy(RTPPacket *packet);

#endif	/* _GAIM_RTP_H */

