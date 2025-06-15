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

#include "rtp.h"
#include "internal.h"
#include "debug.h"

RTPPacket *rtp_packet_parse(char *packet, long packet_len)
{
	RTPPacket *p; int i; unsigned short q;

	if (packet_len < sizeof(RTPPacket)) return NULL;
	
	p = g_new0(RTPPacket,1);
	memcpy(&q,packet,2);
	q = htons(q);

	p->version      = ((q & 0xC000) >> 14) & 0x2;
	p->padding      = ((q & 0x2000) >> 13) & 0x1;
	p->extension    = ((q & 0x1000) >> 12) & 0x1;
	p->csrc_count   = ((q & 0x0F00) >> 8)  & 0xF;
	p->marker       = ((q & 0x0080) >> 7)  & 0x1;
	p->payload_type = (q & 0x007F);
	p->sequence     = ntohs(*(short *)(packet+2));
	p->timestamp    = ntohl(*(long  *)(packet+4));
	p->ssrc         = ntohl(*(long  *)(packet+8));
	
	if (p->csrc_count > 0) {
		p->csrc = g_new0(long,p->csrc_count);
		for (i=0;i<p->csrc_count;i++) 
			p->csrc[i]   = ntohl(*(long *)(packet+12+(i*4)));
	}
	
	if ((p->payload_len = packet_len - (12 + (p->csrc_count*4))) <= 0) {
		g_free(p);
		return NULL;
	}

	p->payload     = g_malloc(p->payload_len);
	memcpy(p->payload,packet+12+(p->csrc_count*4),p->payload_len);
	return p;
}

void rtp_packet_destroy(RTPPacket *packet)
{
	g_return_if_fail(packet != NULL);
	g_free(packet->payload);
	g_free(packet);
}

