import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const u = await User.findOne({ email: 'demo@user.com' });
  console.log('user found:', !!u);
  console.log('role:', u?.role);
  console.log('hash prefix:', u?.passwordHash?.slice(0, 20));
  if (u) {
    const ok = await bcrypt.compare('123456', u.passwordHash);
    console.log('bcrypt match 123456:', ok);
  }
  await mongoose.disconnect();
}
main();
