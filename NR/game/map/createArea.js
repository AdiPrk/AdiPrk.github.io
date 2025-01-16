"use strict"

function createArea (chapter = null, room = null) {
    let roomToCreate = null;
    
    if (chapter != null) {
        roomToCreate = room == null ? FindStartingRoom(chapter) : room;
    } else {
        roomToCreate = FindNextRoom();
    }

    if (!roomToCreate) return;

    let temproom = new Room(roomToCreate);

    let extraRooms = FindExtraRooms(temproom);

    let othertemprooms = [];

    for (let i = 0; i < extraRooms.length; i++) {
        let id = extraRooms[i];
        let skip = false;
        
        for (let j = 0; j < game.tempRooms.length; j++) {
            if (id == game.tempRooms[j].id) skip = true;
        }

        if (skip) continue;

        AddTempRoom(extraRooms[i]);
    }

    if (game.room != null) {
        let filterTempRooms = false;
        for (let i = 0; i < game.tempRooms.length; i++) {
            let room = game.tempRooms[i][0];

            if (room.id == temproom.id) {
                room.delete = true;
                filterTempRooms = true;
            }
        }

        if (filterTempRooms) {
            game.tempRooms = game.tempRooms.filter((e) => e[0].delete != true);
        }
        
        game.tempRooms.push([game.room, 3000]);
        game.freeze = 800;
    }
    game.room = new Room(roomToCreate);

    game.roomBounds = {
        x: game.room.x,
        y: game.room.y,
        w: game.room.w,
        h: game.room.h
    }
    
    game.room.entities = [];
    
    let spawns = [];
    let firstTime = false;
    for (let i = 0; i < temproom.entities.length; i++) {
        let entity = temproom.entities[i];

        if (entity.type == 1) {
            if (game.player.spawn.x == null) {
                firstTime = true;
                game.player.setSpawn(entity.x, entity.y);
            } else {
                spawns.push(entity);
            }
            continue;
        }
        if (entity.type == 2) {
            spawns.push(entity);
            continue;
        }
        if (entity.type == 12 || entity.type == 8) {
            let skip = false;
            for (let j = 0; j < game.removedBlocks.length; j++) {
                let rb = game.removedBlocks[j];
                if (rb.type == entity.type && rb.x == entity.x && rb.y == entity.y) {
                    skip = true;
                    break;
                }
            }
            if (skip) continue;
        }

        game.room.entities.push(new ENTITY_MAP[entity.type](entity));
    }

    let spawnDist = 100000;
    if (!firstTime) {
        for (let i = 0; i < spawns.length; i++) {
            let dist = distance(spawns[i].x, spawns[i].y, game.player.x, game.player.y);
            if (dist < spawnDist) {
                spawnDist = dist;
                game.player.setSpawn(spawns[i].x, spawns[i].y);
            }
        }
    }

    camera.xOffset = parseInt(game.room.camOffsetX);
    camera.yOffset = parseInt(game.room.camOffsetY);
    camera.targetScale = parseFloat(game.room.camScale);
    camera.scaleSpeed = parseFloat(game.room.camScaleSpeed);
    camera.darkness = parseFloat(game.room.darkness);

    gameBGParticles = [];
    gameFGParticles = [];
    for (let i = 0; i < parseInt(game.room.galaxyParticles); i++) {
        gameBGParticles.push(new GalaxyParticle())
    }
    for (let i = 0; i < parseInt(game.room.darkParticles); i++) {
        gameFGParticles.push(new DarkParticle())
    }
}

function FindStartingRoom(e) {
    let chapter = GAME_MAP[e];

    for (let i = 0; i < chapter.rooms.length; i++) {
        if (chapter.rooms[i].starting == true) {
            return chapter.rooms[i];
        }
    }
}

function FindNextRoom() {
    let chapter = GAME_MAP[game.chapter];

    for (let i = 0; i < chapter.rooms.length; i++) {
        if (chapter.rooms[i].id == game.room.id) continue;

        if (RectVsRect(game.player, chapter.rooms[i])) {
            return chapter.rooms[i];
        }
    }

    return false;
}

function FindExtraRooms(newRoom) {
    let chapter = GAME_MAP[game.chapter];
    let extras = [];
    for (let i = 0; i < chapter.rooms.length; i++) {
        let room = chapter.rooms[i];
        
        if (room.id == game?.room?.id || room.id == newRoom.id) continue;

        let px = clamp(room.x, room.x + room.w, game.player.x + game.player.w / 2);
        let py = clamp(room.y, room.y + room.h, game.player.y + game.player.h / 2);
        let dist = distance(px, py, game.player.x + game.player.w / 2, game.player.y + game.player.h / 2);

        if (dist < 1000) {
            extras.push(chapter.rooms[i]);
        }
    }

    return extras;
}

function AddTempRoom(room) {
    let newRoom = new Room(room);
    let entities = [];
    
    for (let i = 0; i < newRoom.entities.length; i++) {
        let entity = newRoom.entities[i];

        if (entity.type == 1 || entity.type == 2) {
            continue;
        }

        entities.push(new ENTITY_MAP[entity.type](entity));
    }

    newRoom.entities = entities;
    
    game.tempRooms.push([newRoom, 3000]);
}