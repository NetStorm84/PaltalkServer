# Introduction
This is a recreation of the Patalk server from around 2002 using version 5.0 of the Paltalk client. Created in Node.js. This code is very messy and nowhere near complete but I wanted to get something out there so that what I have done so far isn't lost forever, hopefully other people will get involved and by the end we would have a fully working Paltalk server with all the features that existed back in the early noughties.

## Setup
To get the server up and running, clone the repo to a local folder, enter the folder and run the following commands

 - `npm install` to install the dependencies.
 - `node database.js` to create the database.
 - Followed by `npm start`. This will initialise the chat server on port 5001 and the voice server on 12718.

### Preparing the client

To prepare the client for connecting to the server we will need to change the IP address of the server that the client is currently trying to connect to. We can do this by downloading the unpacked version of the client and changing the IP address using a HEX editor. I recommend using HxD, link below. 

The client I have available for download below connects to the IP address 192.168.001.16, we can search this IP address within HxD and replace it with our own local IP, remembering that the length must remian the same.

It seems we then need to restart the PC before the client attempts to connect to this new IP address, I think if we have tried connecting before, the IP is also stored in the registry and tries to connect to this IP first. We could delete that entry if it exists... HKEY_CURRENT_USER > Software > PalTalk > host. Maybe we can just change the IP in the registry without modifying the client, I would need to look in to this some more.

I have added a default username and password to the databse setup that we can use to connect to the server. These are listed below. Although, currently, password authentication isn't yet working, so any password would do.

- **Username**: NetStorm
- **Password**: h2kclan

## Resources
Below are a list of resources that were useful in getting the Paltak server recreated.

### External links

[Paltalk.fun](https://paltalk.fun/) This projects main home. Visit here for the latest news and updates regarding this project.

[Paltalk Wikidot](http://paltalk.wikidot.com/introduction) Extremely useful information regarding packets and other tools that were instrumental in getting this up and running

[Olly Dbg](http://www.ollydbg.de/) Tool used to reverse engineer the Paltalk Client

[Wireshark](http://www.wireshark.org/) Used for discecting the pcp file

[WWPack32](https://www.wwpack32.venti.pl/wwpack32_download.html) Used to unpack the original 
Paltalk client

[HxD Hex Editor](https://mh-nexus.de/en/hxd/) Recommended for changing the server IP address within the Paltalk Client

[Resource Hacker](https://www.angusj.com/resourcehacker/) Used to change some strings within the client

[Wayback Machine](https://web.archive.org/) Used to view websites as they were in 2002 and helpful in downloading old tools required to make this work

### Downloads
[Uncompressed version of Patalk 5.0](./resources/Paltalk.zip)

[Wireshark PCAP](./resources/paltalk-secured.pcap.pcapng)

[Gaim Plugin](./resources/gaim-pt.tar.gz) A Paltalk plugin for Gaim, this has been fundamental in getting the server up and running.


![Paltalk client connected to our server recreation](./resources/image.png)
