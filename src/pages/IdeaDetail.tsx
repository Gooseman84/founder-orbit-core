import { useParams } from "react-router-dom";

const IdeaDetail = () => {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Idea Detail Page Placeholder</h1>
      <p className="text-muted-foreground">
        Viewing details for idea: {id}
      </p>
    </div>
  );
};

export default IdeaDetail;
