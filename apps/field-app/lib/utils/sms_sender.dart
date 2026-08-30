import 'dart:async';

import 'package:another_telephony/telephony.dart';

enum SmsDeliveryState { delivered, submitted, unavailable, failed }

class SmsDeliveryResult {
  final SmsDeliveryState state;
  final String detail;

  const SmsDeliveryResult(this.state, this.detail);
}

/// Sends through Android's SmsManager and waits for its send/delivery callbacks.
/// A submitted SMS has reached the carrier; only [delivered] confirms the
/// receiving network acknowledged delivery.
Future<SmsDeliveryResult> sendTrackedSms({
  required Telephony telephony,
  required String recipient,
  required String message,
}) async {
  final canSend = await telephony.isSmsCapable ?? false;
  if (!canSend) {
    return const SmsDeliveryResult(
      SmsDeliveryState.unavailable,
      'This device has no SMS-capable SIM.',
    );
  }

  final delivery = Completer<SendStatus>();
  try {
    await telephony.sendSms(
      to: recipient,
      message: message,
      // Referral messages can exceed one SMS segment. Without this flag some
      // devices reject or truncate the message instead of sending it.
      isMultipart: true,
      statusListener: (status) {
        if (status == SendStatus.DELIVERED && !delivery.isCompleted) {
          delivery.complete(status);
        }
      },
    );

    final status = await delivery.future.timeout(
      const Duration(seconds: 20),
      onTimeout: () => SendStatus.SENT,
    );
    if (status == SendStatus.DELIVERED) {
      return SmsDeliveryResult(
        SmsDeliveryState.delivered,
        'SMS delivered to $recipient',
      );
    }
    return SmsDeliveryResult(
      SmsDeliveryState.submitted,
      'SMS submitted to the carrier for $recipient; delivery is awaiting confirmation.',
    );
  } catch (error) {
    return SmsDeliveryResult(
      SmsDeliveryState.failed,
      'SMS could not be submitted to $recipient: $error',
    );
  }
}
