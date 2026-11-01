import { useState } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";

interface IVoteProps {
  id: string;
  count: number;
}

interface IVoteResponse {
  name: string;
  votes: number;
}

function Vote({ id, count }: IVoteProps) {
  const API_BASE_URL = `${window._env_.API_BASE_URL}`;

  const [vote, setVote] = useState<number>(count);

  const handleClick = () => {
    (async () => {
      const url = `${API_BASE_URL}/languages/${id}/vote`;
      try {
        const response = await axios.get<IVoteResponse>(url);
        if (response.status === 200) {
          const lang = response.data;
          setVote(lang.votes);
        }
      } catch (error) {
        console.log(error);
      }
    })().catch((err) => console.log(err));
  };

  return (
    <div id={id}>
      <Button variant="outline-success" onClick={handleClick}>
        +1
      </Button>
      <div>
        <b>Votes</b>: {vote}
      </div>
    </div>
  );
}

// export Vote - allows the ProgrammingLanguage component to import it
export default Vote;
