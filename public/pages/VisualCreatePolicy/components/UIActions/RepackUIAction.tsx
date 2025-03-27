/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ChangeEvent } from "react";
import { EuiCompressedFormRow, EuiCompressedFieldText } from "@elastic/eui";
import EuiFormCustomLabel from "../EuiFormCustomLabel";
import { RepackAction, UIAction } from "../../../../../models/interfaces";
import { makeId } from "../../../../utils/helpers";
import { ActionType } from "../../utils/constants";

export default class RepackUIAction implements UIAction<RepackAction> {
  id: string;
  action: RepackAction;
  type = ActionType.Repack;

  constructor(action: RepackAction, id: string = makeId()) {
    this.action = action;
    this.id = id;
  }

  content = () => `Repack with '${this.action.repack.new_codec}' codec`;

  clone = (action: RepackAction) => new RepackUIAction(action, this.id);

  isValid = () => {
    const codec = this.action.repack.new_codec;
    return !!codec;
  };

  render = (action: UIAction<RepackAction>, onChangeAction: (action: UIAction<RepackAction>) => void) => {
    const codec = action.action.repack.new_codec;
    return (
      <>
        <EuiFormCustomLabel title="New codec" helpText="The new codec to apply to all segments." isInvalid={!this.isValid()} />
        <EuiCompressedFormRow fullWidth isInvalid={!this.isValid()} error={null}>
          <EuiCompressedFieldText
            fullWidth
            value={typeof codec === "undefined" ? "" : codec}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const newCodec = e.target.value;
              const repack = { new_codec: newCodec };
              if (!newCodec) delete repack.new_codec;
              onChangeAction(this.clone({ repack: repack }));
            }}
            data-test-subj="action-render-repack"
          />
        </EuiCompressedFormRow>
      </>
    );
  };

  toAction = () => this.action;
}
