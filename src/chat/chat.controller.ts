import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { PostChatDto } from './dto/post-chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly ChatService: ChatService) {}

  @Get()
  sayHello() {
    return 'Hello Chat';
  }

  @Post()
  async chatting(
    @Body() body: PostChatDto,
    @Res() res: Response,
  ) {
    if (!body.prompt)
      return res.status(404).json({ message: 'prompt is not found' });

    const profileData = await this.ChatService.sendPrompt(
      body.prompt,
    );
    res.json(profileData);
  }
}
