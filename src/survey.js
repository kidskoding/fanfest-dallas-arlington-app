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
export const SURVEY_QUESTIONS = [
  // Validate the app's pillars — what fans actually want tells you what to build.
  {
    id: 'want',
    type: 'choice',
    prompt: 'What do you want most out of FanFest?',
    options: ['Meet fellow fans', 'Find watch parties', 'Trade pins & merch', 'Deals & giveaways', 'Just the atmosphere'],
  },
  // Behavior — where/how they watch tells you where to reach them.
  {
    id: 'following',
    type: 'choice',
    prompt: 'How are you following the World Cup?',
    options: ['At the stadium', 'Watch parties & bars', 'At home', 'On my phone', 'Highlights only'],
  },
  // Group size — useful for venues, capacity, and marketing.
  {
    id: 'withWho',
    type: 'choice',
    prompt: 'Who are you here with?',
    options: ['Solo', 'Friends', 'Family', 'A big group'],
  },
  // Lightweight NPS — measures whether the app/event is worth spreading.
  {
    id: 'recommend',
    type: 'choice',
    prompt: 'How likely are you to tell a friend about FanFest?',
    options: ['Not likely', 'Maybe', 'Very likely'],
  },
  // The qualitative gold — the brainstorm's core "what's missing" question.
  { id: 'missing', type: 'text', prompt: "What's one thing FanFest is missing?" },
  // Fun + sentiment — gets a fast answer and reveals fan passion.
  { id: 'winner', type: 'text', prompt: 'Who do you think will win the World Cup?' },
];

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
