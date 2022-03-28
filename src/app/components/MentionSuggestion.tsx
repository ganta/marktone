import React from "react";
import styled from "styled-components";

type SuggestedEntity = {
  entityType: "user" | "org" | "group";
  id: string;
  code: string;
  name: string;
  avatarUrl: string;
};

const Component = styled.div`
  border: 1px solid red;
`;

const ItemList = styled.ul``;

const Item = styled.li``;

const Avatar = styled.img``;

type Props = {
  suggestedEntities: SuggestedEntity[];
};

const MentionSuggestion = ({ suggestedEntities }: Props) => {
  return (
    <Component>
      <ItemList>
        {suggestedEntities.map(({ entityType, id, code, name, avatarUrl }) => {
          return (
            <Item key={`${entityType}-${id}`}>
              <Avatar src={avatarUrl} />
              {name} {code}
            </Item>
          );
        })}
      </ItemList>
    </Component>
  );
};

export default MentionSuggestion;
