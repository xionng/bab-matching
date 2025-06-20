import express from 'express';
import Room from '../models/room_schema.js';
import User from '../models/user_schema.js';

const roomRouter = express.Router();

// 방 만들기 - addRoom
roomRouter.post('/addRoom', async (req, res) => {
  try {
    const { currentUserId, storeId, time, maxCount, filter } = req.body;
    const creatorUserId = Array.isArray(currentUserId) ? currentUserId[0] : currentUserId;

    const newRoom = new Room({
      currentUserId,
      storeId,
      time,
      maxCount,
      filter,
    });

    const savedRoom = await newRoom.save();

    await User.findByIdAndUpdate(
      creatorUserId, // 단일 유저
      { $push: { currentRoom: savedRoom._id } },
      { new: true },
    );

    res.status(201).json({ message: '방 만들기 성공', roomId: savedRoom._id });
  } catch (error) {
    console.error('방 만들기 오류:', error);
    console.log(req.body);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 방 목록 가져오기 - main
roomRouter.get('/roomList', async (req, res) => {
  try {
    const rooms = await Room.find({ isFilled: false })
      .sort({ createdAt: -1 })
      .populate('currentUserId')
      .populate('storeId');

    if (!rooms || rooms.length === 0) {
      return res.status(200).json({ message: '방 목록이 없습니다', rooms: [] });
    }

    const now = new Date();
    const KST = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayStr = KST.toISOString().slice(0, 10);
    const currentHour = KST.getHours();

    const allUsers = await User.find({ currentRoom: { $exists: true, $not: { $size: 0 } } });

    for (const user of allUsers) {
      let updated = false;

      for (const roomId of [...user.currentRoom]) {
        const room = rooms.find((r) => r._id.equals(roomId));
        if (!room) continue;

        // 방 생성일과 오늘 비교
        const createdDate = new Date(room.createdAt.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (createdDate !== todayStr) continue;

        if (room.time.end + 1 <= currentHour) {
          user.currentRoom = user.currentRoom.filter((id) => !id.equals(roomId));
          if (!user.historyRoom?.some((id) => id.equals(roomId))) {
            user.historyRoom = user.historyRoom ? [...user.historyRoom, roomId] : [roomId];
          }
          updated = true;
        }
      }

      if (updated) {
        await user.save();
      }
    }

    res.status(200).json(rooms);
  } catch (err) {
    console.error('방 목록 불러오기 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 현재 방 목록 가져오기 - main
roomRouter.post('/multipleRoom', async (req, res) => {
  try {
    const { roomIds } = req.body;
    const rooms = await Room.find({ _id: { $in: roomIds } }).populate('storeId');
    res.status(200).json(rooms);
  } catch (err) {
    res.status(500).json({ message: '방 정보 불러오기 실패' });
  }
});

// 단일 방 정보 가져오기
roomRouter.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).populate('storeId');
    if (!room) {
      return res.status(404).json({ message: '방을 찾을 수 없습니다' });
    }
    res.status(200).json(room);
  } catch (err) {
    console.error('방 조회 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 채팅 작성하기
roomRouter.post('/:roomId/chat', async (req, res) => {
  try {
    const { content, creatorId } = req.body;
    const { roomId } = req.params;

    if (!content || !creatorId) {
      return res.status(400).json({ message: '내용과 작성자가 필요합니다' });
    }

    const chat = {
      content,
      creatorId,
      createdAt: new Date(),
    };

    const updatedRoom = await Room.findByIdAndUpdate(roomId, { $push: { chats: chat } }, { new: true }).populate({
      path: 'chats.creatorId',
      model: 'User',
    });

    res.status(200).json(updatedRoom.chats);
  } catch (err) {
    console.error('채팅 저장 실패:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 방의 채팅 불러오기 (초기 로딩)
roomRouter.get('/:roomId/chat', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).populate('chats.creatorId');
    res.status(200).json(room.chats);
  } catch (err) {
    console.error('채팅 불러오기 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});
export default roomRouter;
