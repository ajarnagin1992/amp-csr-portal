import { useState, type SubmitEvent } from 'react';
import { Alert, Button, Paper, PasswordInput, TextInput, Title } from '@mantine/core';
import { LoginError } from '../../api/auth.js';
import { useLogin } from './useLogin.js';

function errorMessage(error: Error): string {
  if (error instanceof LoginError) {
    if (error.status === 401) return 'Invalid email or password.';
    if (error.status === 429) return 'Too many failed attempts. Try again in a few minutes.';
  }
  return 'Sign-in failed. Please try again.';
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <Paper withBorder shadow="sm" p="xl" w="100%" maw={380}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Title order={2}>CSR Portal</Title>
          <TextInput
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          {login.isError && (
            <Alert color="red" role="alert">
              {errorMessage(login.error)}
            </Alert>
          )}
          <Button type="submit" loading={login.isPending}>
            Sign in
          </Button>
        </form>
      </Paper>
    </div>
  );
}
