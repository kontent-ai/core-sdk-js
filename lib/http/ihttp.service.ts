import {
  IResponse,
  IHttpDeleteQueryCall,
  IHttpGetQueryCall,
  IHttpPostQueryCall,
  IHttpPutQueryCall,
  IHttpQueryOptions,
  IHttpPatchQueryCall,
  IHttpCancelRequestToken,
} from './http.models';

export interface IHttpService<TCancelToken> {
  getAsync<TRawData>(call: IHttpGetQueryCall, options?: IHttpQueryOptions<TCancelToken>): Promise<IResponse<TRawData>>;
  postAsync<TRawData>(call: IHttpPostQueryCall, options?: IHttpQueryOptions<TCancelToken>): Promise<IResponse<TRawData>>;
  putAsync<TRawData>(call: IHttpPutQueryCall, options?: IHttpQueryOptions<TCancelToken>): Promise<IResponse<TRawData>>;
  patchAsync<TRawData>(call: IHttpPatchQueryCall, options?: IHttpQueryOptions<TCancelToken>): Promise<IResponse<TRawData>>;
  deleteAsync<TRawData>(call: IHttpDeleteQueryCall, options?: IHttpQueryOptions<TCancelToken>): Promise<IResponse<TRawData>>;

  createCancelToken(): IHttpCancelRequestToken<TCancelToken>;
}
