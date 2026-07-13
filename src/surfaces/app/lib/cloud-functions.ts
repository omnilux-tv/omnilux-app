import { supabase } from "@/lib/supabase";

type CloudFunctionInvokeOptions = Parameters<
  typeof supabase.functions.invoke
>[1];

export async function invokeCloudFunction<TResponse>(
  functionName: string,
  options?: CloudFunctionInvokeOptions
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke<TResponse>(
    functionName,
    options
  );
  if (error) throw error;
  if (data == null) {
    throw new Error(`${functionName} did not return a response.`);
  }
  return data;
}

export async function invokeCloudAction(
  functionName: string,
  options?: CloudFunctionInvokeOptions
): Promise<void> {
  const { error } = await supabase.functions.invoke(functionName, options);
  if (error) throw error;
}

export async function invokeControlFunction<
  TResponse,
  TInput = Record<string, never>,
>(
  functionName: string,
  operation: string,
  input?: TInput,
  options?: Omit<CloudFunctionInvokeOptions, "body">
): Promise<TResponse> {
  return invokeCloudFunction<TResponse>(functionName, {
    ...options,
    body: { operation, version: 1, input: input ?? {} },
  });
}
