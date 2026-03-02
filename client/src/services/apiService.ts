export const get = async (url: string, options?: any) => ({ data: {} }); 
export const post = async (url: string, data?: any, options?: any) => ({ data: {} }); 
export const put = async (url: string, data?: any, options?: any) => ({ data: {} }); 
export const del = async (url: string, options?: any) => ({ data: {} }); 
export const api = { get, post, put, delete: del }; 
export default api;