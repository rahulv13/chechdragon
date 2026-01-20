# How to Fix "Upload Timed Out" (CORS Issue)

The "Upload timed out" error occurs because your Firebase Storage bucket is blocking uploads from your Vercel website (Cross-Origin Resource Sharing). You need to tell Google Cloud to allow your website to send files.

## The Fix (Easiest Method)

1.  Go to the **Google Cloud Console** for your project:
    [https://console.cloud.google.com/welcome?project=studio-9785080716-f6f37](https://console.cloud.google.com/welcome?project=studio-9785080716-f6f37)

2.  Click the **Activate Cloud Shell** icon in the top-right toolbar (it looks like a terminal prompt `>_`).

3.  Wait for the terminal to appear at the bottom of the screen.

4.  **Copy and paste** the following command into the Cloud Shell and hit **Enter**:

    ```bash
    echo '[{"origin": ["*"],"method": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],"responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"],"maxAgeSeconds": 3600}]' > cors.json && gsutil cors set cors.json gs://studio-9785080716-f6f37.firebasestorage.app
    ```

5.  Wait for it to say `Setting CORS on gs://...`.

6.  **Done!** Go back to your dashboard and try uploading the image again. It should work instantly.

---

### Explanation
This command creates a temporary `cors.json` file in the Cloud Shell and uses the `gsutil` tool (which is pre-installed) to apply these rules to your specific storage bucket (`gs://studio-9785080716-f6f37.firebasestorage.app`). The configuration allows all origins (`*`) to upload, which is perfect for development and Vercel previews.
