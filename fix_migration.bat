@echo off
echo Fixing failed migration...

:: Step 1: Mark failed migration as rolled back
npx prisma migrate resolve --rolled-back 20260401111857_add_dm_fields

:: Step 2: Run new migration
npx prisma migrate dev --name add_reply_to

echo Done!
