import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import env from './env';

// Fan-insight survey. Questions are intentionally BLANK for now — fill in
// SURVEY_QUESTIONS below and the survey UI + its entry button on the ticket
// screen activate automatically (the button stays hidden while this is empty).
//
// Each question is one of:
//   { id: 'unique_key', type: 'text',   prompt: 'Your question?' }
//   { id: 'unique_key', type: 'choice', prompt: 'Pick one', options: ['A', 'B', 'C'] }
//
// Examples to paste in when ready (from the brainstorm):
//   { id: 'missing', type: 'text',   prompt: "What's one thing FanFest is missing?" },
//   { id: 'wish',    type: 'text',   prompt: 'What did you wish was here?' },
//   { id: 'heard',   type: 'choice', prompt: 'How did you hear about us?', options: ['Friend', 'At the booth', 'Social media', 'Other'] },
export const SURVEY_QUESTIONS = [];

const SURVEYS = `surveys${env.suffix}`;

// Store one survey response set. Tied to the fan id (if known) for organizer
// analysis; never read back by clients.
export async function submitSurvey(fanId, responses) {
  return addDoc(collection(db, SURVEYS), {
    fanId: fanId || null,
    uid: auth.currentUser ? auth.currentUser.uid : null,
    responses: responses || {},
    createdAt: serverTimestamp(),
  });
}
