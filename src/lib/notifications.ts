import { db } from './db';
import { sendEmail } from './email';

export async function createNotification({
  userId,
  title,
  message,
  type = 'SYSTEM',
  linkUrl,
  sendMail = true,
}: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  linkUrl?: string;
  sendMail?: boolean;
}) {
  try {
    const notification = await db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        linkUrl,
      },
    });

    if (sendMail) {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        sendEmail({
          to: user.email,
          subject: `Sadbhawana Notification: ${title}`,
          title,
          bodyText: message,
          buttonText: linkUrl ? 'View Details' : undefined,
          buttonUrl: linkUrl ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${linkUrl}` : undefined,
        }).catch((e) => console.error('Background email failed:', e));
      }
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
