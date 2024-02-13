import { useState, useEffect } from 'react';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import * as mutations from '@/graphql/mutations';
import * as queries from '@/graphql/queries';
import config from '@/amplifyconfiguration.json';

const cookiesClient = generateServerClientUsingCookies({
  config,
  cookies
});

async function createTodo(formData: FormData) {
  try {
    const { data } = await cookiesClient.graphql({
      query: mutations.createTodo,
      variables: {
        input: {
          name: formData.get('name')?.toString() ?? ''
        }
      }
    });

    console.log('Created Todo: ', data?.createTodo);

    revalidatePath('/'); // Revalidate after creating todo
  } catch (error) {
    console.error('Error creating todo:', error);
  }
}

interface Todo {
  id: string;
  name: string;
  // Define other properties of Todo if needed
}

interface HomeProps {
  initialTodos: Todo[];
}

export default function Home({ initialTodos }: HomeProps) {
  const [todos, setTodos] = useState(initialTodos);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      const { data } = await cookiesClient.graphql({
        query: queries.listTodos
      });

      setTodos(data.listTodos.items);
    }, 60000); // Refresh todos every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', marginTop: '100px' }}>
      <form onSubmit={(e) => { e.preventDefault(); createTodo(new FormData(e.target as HTMLFormElement)); }}>
        <input name="name" placeholder="Add a todo" />
        <button type="submit">Add</button>
      </form>

      {(todos && todos.length > 0) ? (
        <ul>
          {todos.map((todo, index) => (
            <li key={index} style={{ listStyle: 'none' }}>{todo.name}</li>
          ))}
        </ul>
      ) : (
        <p>No todos, please add one.</p>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const { data } = await cookiesClient.graphql({
      query: queries.listTodos
    });

    const initialTodos: Todo[] = data.listTodos.items;

    return {
      props: {
        initialTodos
      }
    };
  } catch (error) {
    console.error('Error fetching initial todos:', error);

    return {
      props: {
        initialTodos: []
      }
    };
  }
}
