# PopAI

PopAI is a rule-based, on-device assistant. It classifies supported prompts and computes results from the active merchant's ledger. It has no live model, runtime API key, remote logs or model hallucination fallback.

Read intents include merchant and customer balances, largest open balances, overdue records, on-time settlement, pending requests, collection rate, and collections for the current week, month or all time. Unsupported periods and commands return guidance.

Write intents can prepare a PopCard, a reminder draft or a repayment. PopAI matches a customer by full name or unique name component within the current workspace. An action preview names and describes the target and amount. A customer with more than one outstanding credit account must choose the exact account in the ledger. A new PopCard uses a disclosed due date 14 days ahead. A repayment exceeding the open balance is rejected. Clicking **Confirm action** runs the same validated credit engine as the rest of the app; the preview alone writes nothing.

Conversation history is scoped to the open workspace and stays in memory. Switching merchants, leaving the page or resetting clears it. Completed mutations are visible as domain records and ledger entries. Reminder drafts are never sent.
