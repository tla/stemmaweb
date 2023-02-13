/** Wrapper object to return API responses with a clean error-handling. */
export interface BaseResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
