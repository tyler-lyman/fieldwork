require('dotenv').config();
const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Skip notarization in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping notarization in development');
    return;
  }

  // Skip if no Apple ID provided
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log('Skipping notarization: Apple credentials not found');
    console.log('APPLE_ID:', process.env.APPLE_ID ? 'Set' : 'Not set');
    console.log('Password:', process.env.APPLE_APP_SPECIFIC_PASSWORD ? 'Set' : 'Not set');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log('Notarizing', appPath);

  try {
    await notarize({
      appBundleId: 'com.yourcompany.uxwriterslibrary',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    });
    
    console.log('Notarization successful');
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }
};