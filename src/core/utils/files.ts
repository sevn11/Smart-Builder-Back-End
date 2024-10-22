import { Readable } from "stream";

export function bufferToStream(buffer: Buffer): Readable {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null); // End the stream
    return stream;
}