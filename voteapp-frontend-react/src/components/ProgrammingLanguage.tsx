import { useState, useEffect } from "react";
import Vote from "./Vote";
import axios from "axios";
import Image from "react-bootstrap/Image";

interface IProgrammingLanguageProps {
  id: string;
  logo: string;
}

interface ILanguage {
  name: string;
  codedetail: {
    usecase: string;
    rank: number;
    homepage: string;
    votes: number;
  };
}

function ProgrammingLanguage({ id, logo }: IProgrammingLanguageProps) {
  const [loaded, setLoaded] = useState(false);
  const [language, setLanguage] = useState<ILanguage>({
    name: "",
    codedetail: { usecase: "", rank: 0, votes: 0, homepage: "" },
  });

  useEffect(() => {
    async function fetchData() {
      const API_BASE_URL = `${window._env_.API_BASE_URL}`;
      const url = `${API_BASE_URL}/languages/${id}`;
      await axios.get<ILanguage>(url).then((response) => {
        const lang = response.data as ILanguage;
        setLanguage(lang);
        setLoaded(true);
      });
    }
    fetchData().catch((err) => console.log(err));
  }, [id]);

  const usecase = language.codedetail.usecase;
  const rank = language.codedetail.rank;
  const homepage = language.codedetail.homepage;
  const votecount = language.codedetail.votes;

  return (
    <>
      {loaded ? (
        <div className="container">
          <div className="row">
            <div className="col g-3">
              <Vote id={id} count={votecount} />
            </div>
          </div>
          <div className="row">
            <div className="col g-3">
              <b>Uses</b>: {usecase}
            </div>
          </div>
          <div className="row">
            <div className="col g-3">
              <b>Rank</b>: {rank}
            </div>
          </div>
          <div className="row">
            <div className="col g-3">
              <a
                href={homepage}
                target="blank"
                className="text-decoration-none"
              >
                {homepage}
              </a>
            </div>
          </div>
          <div className="row">
            <div className="col g-3">
              <Image src={`./img/${logo}`} alt="logo" width={100} />
            </div>
          </div>
        </div>
      ) : (
        <div></div>
      )}
    </>
  );
}

// export ProgrammingLanguage - allows the VoteApp component to import it
export default ProgrammingLanguage;
