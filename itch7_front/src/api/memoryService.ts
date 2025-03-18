// API service for communicating with the backend
import { getUserId } from '../utils/userIdentifier'
const API_BASE_URL = 'http://localhost:5002/api';

export const memoryService = {
    // Export memory snapshot
    exportMemory: async (): Promise<string> => {
        try {
            const userId = await getUserId();
            console.log(`Starting memory snapshot export for user: ${userId}...`);
            const response = await fetch(`${API_BASE_URL}/export-memory`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Accept': 'application/octet-stream',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });

            console.log("Received response:", response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Export failed:", errorText);
                throw new Error(`Export failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            console.log("Received blob:", blob.size, "bytes");

            const url = window.URL.createObjectURL(blob);

            // Create a hidden download link
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            // Name the file using a timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `memory-snapshot-${timestamp}.snapshot`;

            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            return a.download;
        } catch (error) {
            console.error("Memory export failed:", error);
            throw error;
        }
    },

    // Import memory snapshot
    importMemory: async (file: File): Promise<void> => {
        try {
            const userId = await getUserId();
            console.log(`Starting file upload for user ${userId}:`, file.name, file.size, "bytes");
            const formData = new FormData();
            formData.append('snapshot', file);
            formData.append('user_id', userId);

            const response = await fetch(`${API_BASE_URL}/import-memory`, {
                method: 'POST',
                mode: 'cors',
                body: formData,
            });

            console.log("Import response:", response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Import failed:", errorText);
                throw new Error(`Import failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Import successful:", result);
            return result;
        } catch (error) {
            console.error("Memory import failed:", error);
            throw error;
        }
    },

    // Reset user's memory database
    resetMemory: async (): Promise<void> => {
        try {
            const userId = await getUserId();
            console.log(`Resetting memory database for user ${userId}...`);

            const response = await fetch(`${API_BASE_URL}/reset-memory`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: userId })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Reset failed:", errorText);
                throw new Error(`Reset failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Memory reset successful:", result);
            return result;
        } catch (error) {
            console.error("Memory reset failed:", error);
            throw error;
        }
    }
};