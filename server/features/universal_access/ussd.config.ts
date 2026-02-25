/**
 * USSD Configuration
 * 
 * Configuration for USSD service including menu structures and settings
 */

import type { USSDMenu, USSDLanguage } from './ussd.types';

export const USSD_CONFIG = {
  serviceCode: '*384*96#',
  sessionTimeout: 180, // 3 minutes
  maxMenuDepth: 5,
  maxTextLength: 160,
  defaultLanguage: 'en' as USSDLanguage,
  supportedLanguages: ['en', 'sw', 'ki'] as USSDLanguage[],
  rateLimits: {
    requestsPerMinute: 10,
    requestsPerHour: 100
  }
};

export const USSD_MENUS: Record<string, USSDMenu> = {
  main: {
    id: 'main',
    title: 'Chanuka - Legislative Info',
    options: [
      { key: '1', label: 'Active Bills', action: 'navigate', target: 'bills' },
      { key: '2', label: 'My MP Info', action: 'navigate', target: 'mp_info' },
      { key: '3', label: 'Track Bill', action: 'navigate', target: 'track_bill' },
      { key: '4', label: 'Alerts', action: 'navigate', target: 'alerts' },
      { key: '5', label: 'Language', action: 'navigate', target: 'language' },
      { key: '0', label: 'Help', action: 'navigate', target: 'help' }
    ]
  },
  bills: {
    id: 'bills',
    title: 'Active Bills',
    parent: 'main',
    options: [
      { key: '1', label: 'Latest Bills', action: 'execute', handler: 'getLatestBills' },
      { key: '2', label: 'By Category', action: 'navigate', target: 'bill_categories' },
      { key: '3', label: 'Search Bill', action: 'input', handler: 'searchBill' },
      { key: '0', label: 'Back', action: 'navigate', target: 'main' }
    ]
  },
  mp_info: {
    id: 'mp_info',
    title: 'MP Information',
    parent: 'main',
    options: [
      { key: '1', label: 'Find by Constituency', action: 'input', handler: 'findMPByConstituency' },
      { key: '2', label: 'Find by Name', action: 'input', handler: 'findMPByName' },
      { key: '0', label: 'Back', action: 'navigate', target: 'main' }
    ]
  },
  track_bill: {
    id: 'track_bill',
    title: 'Track Bill',
    parent: 'main',
    options: [
      { key: '1', label: 'Enter Bill Number', action: 'input', handler: 'trackBillById' },
      { key: '2', label: 'My Tracked Bills', action: 'execute', handler: 'getMyTrackedBills' },
      { key: '0', label: 'Back', action: 'navigate', target: 'main' }
    ]
  },
  alerts: {
    id: 'alerts',
    title: 'SMS Alerts',
    parent: 'main',
    options: [
      { key: '1', label: 'Subscribe', action: 'execute', handler: 'subscribeAlerts' },
      { key: '2', label: 'Unsubscribe', action: 'execute', handler: 'unsubscribeAlerts' },
      { key: '3', label: 'My Alerts', action: 'execute', handler: 'getMyAlerts' },
      { key: '0', label: 'Back', action: 'navigate', target: 'main' }
    ]
  },
  language: {
    id: 'language',
    title: 'Select Language',
    parent: 'main',
    options: [
      { key: '1', label: 'English', action: 'execute', handler: 'setLanguage:en' },
      { key: '2', label: 'Kiswahili', action: 'execute', handler: 'setLanguage:sw' },
      { key: '3', label: 'Kikuyu', action: 'execute', handler: 'setLanguage:ki' },
      { key: '0', label: 'Back', action: 'navigate', target: 'main' }
    ]
  },
  help: {
    id: 'help',
    title: 'Help & Info',
    parent: 'main',
    options: [
      { key: '1', label: 'How to Use', action: 'execute', handler: 'showHelp' },
      { key: '2', label: 'About Chanuka', action: 'execute', handler: 'showAbout' },
      { key: '3', label: 'Contact', action: 'execute', handler: 'showContact' },
      { key: '0', label: 'Back', action: 'navigate', target: 'main' }
    ]
  }
};
