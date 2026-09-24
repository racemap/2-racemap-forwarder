import { Alert } from 'antd';
import type { OutboxState } from 'src/types';

// Race day question number one: did the reads reach RACEMAP?
export const UploadStatus = ({ outbox }: { outbox: OutboxState }) => {
  const forwarded = `${outbox.forwarded} reads sent to RACEMAP${outbox.lastForwardedAt ? `, last at ${new Date(outbox.lastForwardedAt).toLocaleTimeString()}` : ''}.`;

  return (
    <>
      {outbox.queued > 0 && outbox.lastError && (
        <Alert
          type="warning"
          showIcon
          message={`${outbox.queued} reads are waiting to be sent to RACEMAP`}
          description={`They are saved on this computer and sent automatically when RACEMAP is reachable again. Last error: ${outbox.lastError}`}
        />
      )}
      {outbox.rejected > 0 && (
        <Alert
          type="error"
          showIcon
          message={`RACEMAP rejected ${outbox.rejected} reads`}
          description="They are kept in outbox.jsonl.rejected in the app data folder. Please send us feedback so we can look into it."
        />
      )}
      <p style={{ margin: '8px 0 0' }}>{forwarded}</p>
    </>
  );
};
