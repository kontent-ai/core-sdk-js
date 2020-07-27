import { Observable } from 'rxjs';

import {
  IBaseResponse,
  IHttpDeleteQueryCall,
  IHttpGetQueryCall,
  IHttpPostQueryCall,
  IHttpPutQueryCall,
  IHttpQueryOptions,
  IHttpPatchQueryCall,
} from './http.models';

export interface IHttpService {

  post<TRawData extends any>(
    call: IHttpPostQueryCall,
    options?: IHttpQueryOptions
  ): Observable<IBaseResponse<TRawData>>;

  get<TRawData extends any>(
    call: IHttpGetQueryCall,
    options?: IHttpQueryOptions
  ): Observable<IBaseResponse<TRawData>>;

  put<TRawData extends any>(
    call: IHttpPutQueryCall,
    options?: IHttpQueryOptions
  ): Observable<IBaseResponse<TRawData>>;

  patch<TRawData extends any>(
    call: IHttpPatchQueryCall,
    options?: IHttpQueryOptions
  ): Observable<IBaseResponse<TRawData>>;

  delete<TRawData extends any>(
    call: IHttpDeleteQueryCall,
    options?: IHttpQueryOptions
  ): Observable<IBaseResponse<TRawData>>;
}
