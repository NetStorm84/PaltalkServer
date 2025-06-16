# Setup Directory

This directory contains scripts and tools used for setting up the Paltalk Server.

## Contents

- `database.js` - Creates and initializes the SQLite database with default data
  
## Usage

To initialize the database:

```bash
node setup/database.js
```

This will create a new database.db file in the root directory with the required tables and initial data.

## Database Structure

The database.js script creates the following tables:
- users: User accounts and preferences
- offline_messages: Messages sent when users are offline
- categories: Room categories
- groups: Chat rooms with their properties

Each table is initialized with default data required for the server to function properly.
