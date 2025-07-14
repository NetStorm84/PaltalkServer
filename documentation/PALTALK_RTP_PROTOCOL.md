# Paltalk RTP Audio Protocol Specification

## Overview

This document describes the expected RTP packet format for audio streaming in Paltalk clients. Server implementations must follow this exact format for compatibility with Paltalk clients.

## Packet Structure

### 1. Length Header (4 bytes)

The server must send a 4-byte length header before each RTP packet:
- **Size**: Exactly 4 bytes
- **Format**: Little-endian integer
- **Usage**: Only the last byte (byte 3) is used by the client as the actual packet length
- **Valid Range**: 1 to 149 bytes
- **Invalid lengths**: Packets with length ≤ 0 or ≥ 150 will be discarded by the client

### 2. RTP Packet

Following the length header, send the complete RTP packet with the specified length.

#### RTP Header Format (Standard RFC 3550)

- **Version** (2 bits): Must be 2
- **Padding** (1 bit): Padding flag
- **Extension** (1 bit): Extension flag
- **CSRC Count** (4 bits): Number of contributing sources (typically 0)
- **Marker** (1 bit): Marker bit
- **Payload Type** (7 bits): **MUST be 3** (Paltalk audio codec identifier)
- **Sequence Number** (16 bits): Incremental packet sequence
- **Timestamp** (32 bits): NTP format timestamp
- **SSRC** (32 bits): Speaker identifier (user ID)
- **CSRC List** (variable): Contributing sources if CSRC Count > 0

#### Audio Payload Requirements

- **Minimum Size**: 136 bytes
- **Recommended Size**: Exactly 136 bytes
- **Format**: Paltalk proprietary audio codec (payload type 3)
- **Validation**: Clients will reject packets with payload < 136 bytes

## Critical Requirements

### Payload Type Validation
The client performs strict validation:
- Payload type **MUST** equal 3
- Payload length **MUST** be at least 136 bytes
- Any deviation will cause packet rejection

### SSRC for Speaker Identification
- The SSRC field identifies the speaking user
- This value is used by the client to:
  - Display speaking indicators in the UI
  - Map audio to specific users in the chat room
  - Manage speaker timeouts and status updates

### Packet Timing
- Clients implement speaker timeout logic (0.45 seconds)
- Continuous packet flow maintains "speaking" status
- Gaps in transmission will remove speaking indicators

## Complete Transmission Sequence

1. **Calculate packet length** (RTP header + payload)
2. **Send 4-byte length header** (only last byte matters, must be 1-149)
3. **Send RTP header** with:
   - Payload type = 3
   - Proper SSRC (speaker UID)
   - Sequential sequence numbers
   - Current timestamp
4. **Send audio payload** (minimum 136 bytes)

## Server Implementation Notes

### Audio Frame Size
Paltalk expects consistent 136-byte audio frames, suggesting a specific codec with fixed frame sizes.

### User Identification
Use the SSRC field to identify which user is transmitting audio. This must correspond to valid user IDs in the chat room.

### Error Handling
Clients will silently drop invalid packets. Ensure:
- Length headers are within valid range
- Payload types are exactly 3
- Payload sizes meet minimum requirements

### Network Considerations
- Packets are sent over TCP (not UDP as typical for RTP)
- No additional framing beyond the 4-byte length prefix
- Clients expect reliable, ordered delivery

## Example Packet Flow

For a typical audio packet:
1. Audio data: 136 bytes
2. RTP header: 12 bytes (assuming no CSRC)
3. Total RTP packet: 148 bytes
4. Length header: 4 bytes with value 148 in last byte
5. Total transmission: 152 bytes

## Compatibility Notes

This protocol appears to be specific to Paltalk's implementation and uses:
- Custom length prefixing (non-standard for RTP)
- Specific payload type (3) for proprietary codec
- Fixed payload sizes (136 bytes)
- TCP transport instead of typical UDP for RTP

Server implementations must exactly match these requirements for client compatibility.
