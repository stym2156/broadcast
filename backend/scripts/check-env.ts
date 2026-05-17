import 'dotenv/config';
import { fbConfig, isFbConfigured } from '../src/services/facebook';
import { waConfig, isWaConfigured } from '../src/services/whatsapp';

const fb = fbConfig();
const wa = waConfig();

console.log('FB_APP_ID set:', !!fb.appId, 'length:', fb.appId.length);
console.log('FB_APP_SECRET set:', !!fb.appSecret, 'length:', fb.appSecret.length);
console.log('FB_VERIFY_TOKEN set:', !!fb.verifyToken);
console.log('isFbConfigured():', isFbConfigured());
console.log('---');
console.log('WA_PHONE_NUMBER_ID set:', !!wa.phoneNumberId);
console.log('WA_ACCESS_TOKEN length:', wa.accessToken.length);
console.log('isWaConfigured():', isWaConfigured());
