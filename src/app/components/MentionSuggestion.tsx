import React, { useState } from "react";
import styled from "styled-components";

type SuggestedEntity = {
  entityType: "user" | "org" | "group";
  id: string;
  code: string;
  name: string;
  avatarUrl: string;
};

const Component = styled.div`
  border-width: 1px;
  border-style: solid;
  border-color: #ccc;
  border-radius: 4px;
  box-shadow: rgba(0, 0, 0, 0.1) 0 4px 12px 0;
  max-height: 200px;
  overflow-x: hidden;
  overflow-y: auto;
`;

const ItemList = styled.ul`
  list-style: none;
  margin: 6px 0;
  padding: 0;
`;

const Item = styled.li<{ selected: boolean }>`
  display: flex;
  flex-direction: row;
  line-height: 20px;
  font-size: 14px;
  padding: 4px 8px;
  background-color: ${({ selected }) => (selected ? "#0c50cd" : "transparent")};
  color: ${({ selected }) => (selected ? "#fff" : "#000")};
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
`;

const Avatar = styled.span`
  display: inline-block;
  width: 20px;
  height: 20px;
`;

const Name = styled.span`
  font-weight: bold;
  margin: 0 8px;
`;

const Code = styled.span`
  opacity: 0.75;
`;

type Props = {
  suggestedEntities: SuggestedEntity[];
};

const MentionSuggestion = ({ suggestedEntities }: Props) => {
  const [selectedEntity, _selectEntity] = useState(suggestedEntities[0]);

  return (
    <Component>
      <ItemList>
        {suggestedEntities.map((entity) => {
          const { entityType, id, code, name, avatarUrl } = entity;

          return (
            <Item
              key={`${entityType}-${id}`}
              selected={entity === selectedEntity}
            >
              <Avatar>
                <AvatarImage src={avatarUrl} alt="" />
              </Avatar>
              <Name>{name}</Name> <Code>{code}</Code>
            </Item>
          );
        })}
      </ItemList>
    </Component>
  );
};

export default MentionSuggestion;
