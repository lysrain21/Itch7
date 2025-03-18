// Chat service API for communicating with the backend
import { getUserId } from '../utils/userIdentifier'
const API_BASE_URL = 'http://localhost:5002/api';

export const chatService = {
    // Send a message to the AI and get a streaming response
    sendMessageStream: async (
        message: string,
        onChunk: (chunk: string) => void,
        onDone: () => void,
        onError: (error: Error) => void,
        isAngry: boolean = false,
        onControlMessage?: (control: string) => void,
        isRepenting: boolean = false  // 添加忏悔状态参数
    ): Promise<void> => {
        try {
            const userId = await getUserId();
            console.log(`Sending message to AI (streaming) for user ${userId}:`, message);

            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify({
                    message,
                    user_id: userId,
                    is_angry: isAngry,
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("AI response failed:", errorText);
                throw new Error(`Chat request failed: ${response.statusText}`);
            }

            // Get the response reader
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Unable to get response stream');
            }

            // Create a text decoder
            const decoder = new TextDecoder();

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    onDone();
                    break;
                }

                // Decode the newly received data
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Process complete SSE messages
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));

                            // 处理控制消息
                            if (data.control && onControlMessage) {
                                onControlMessage(data.control);
                                continue;
                            }

                            if (data.content) {
                                onChunk(data.content);
                            }

                            if (data.done) {
                                onDone();
                                return;
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE data', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.error("Chat stream request error:", error);
            onError(error instanceof Error ? error : new Error('Unknown error'));
        }
    },

    // Original non-streaming method as a fallback
    sendMessage: async (message: string): Promise<string> => {
        try {
            const userId = await getUserId();
            console.log(`Sending message to AI for user ${userId}:`, message);

            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    user_id: userId
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("AI response failed:", errorText);
                throw new Error(`Chat request failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Received AI response:", result);
            return result.response;
        } catch (error) {
            console.error("Chat request error:", error);
            throw error;
        }
    }
};