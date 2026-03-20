/**
 * Navigation Utilities
 * Provides navigation helper functions
 */

export const navigationUtils = {
  navigate: (path: string) => {
    console.log('Navigating to:', path);
  },
  
  goBack: () => {
    console.log('Going back');
  },
  
  getCurrentPath: () => {
    return window.location.pathname;
  },
};

export default navigationUtils;


export const navigationService = navigationUtils;
