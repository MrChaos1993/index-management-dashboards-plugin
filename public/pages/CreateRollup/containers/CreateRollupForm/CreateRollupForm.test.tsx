/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { Redirect, Route, RouteComponentProps, Switch } from "react-router-dom";
import { MemoryRouter as Router } from "react-router";
import userEventModule from "@testing-library/user-event";
import { ServicesConsumer, ServicesContext } from "../../../../services";
import { browserServicesMock, coreServicesMock } from "../../../../../test/mocks";
import { BrowserServices } from "../../../../models/interfaces";
import { ModalProvider, ModalRoot } from "../../../../components/Modal";
import { BREADCRUMBS, ROUTES } from "../../../../utils/constants";
import CreateRollupForm from "./CreateRollupForm";
import { CoreServicesContext } from "../../../../components/core_services";
import { DataStream } from "../../../../../server/models/interfaces";
import { getApplication, getNavigationUI, getUISettings } from "../../../../services/Services";

jest.mock("../../../../services/Services", () => ({
  ...jest.requireActual("../../../../services/Services"),
  getUISettings: jest.fn(),
  getApplication: jest.fn(),
  getNavigationUI: jest.fn(),
}));

beforeEach(() => {
  (getUISettings as jest.Mock).mockReturnValue({
    get: jest.fn().mockReturnValue(false), // or false, depending on your test case
  });
  (getApplication as jest.Mock).mockReturnValue({});

  (getNavigationUI as jest.Mock).mockReturnValue({});
});

const sampleMapping = {
  index_1: {
    mappings: {
      properties: {
        category: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
            },
          },
        },
        customer_gender: {
          type: "keyword",
        },
        day_of_week: {
          type: "keyword",
        },
        day_of_week_i: {
          type: "integer",
        },
        geoip: {
          properties: {
            city_name: {
              type: "keyword",
            },
            region_name: {
              type: "keyword",
            },
          },
        },
        order_date: {
          type: "date",
        },
        products: {
          properties: {
            _id: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword",
                  ignore_above: 256,
                },
              },
            },
            category: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword",
                },
              },
            },
            price: {
              type: "half_float",
            },
            quantity: {
              type: "integer",
            },
            tax_amount: {
              type: "half_float",
            },
            taxful_price: {
              type: "half_float",
            },
            taxless_price: {
              type: "half_float",
            },
          },
        },
        taxful_total_price: {
          type: "half_float",
        },
        taxless_total_price: {
          type: "half_float",
        },
        total_quantity: {
          type: "integer",
        },
        type: {
          type: "keyword",
        },
        user: {
          type: "keyword",
        },
      },
    },
  },
};

function renderCreateRollupFormWithRouter() {
  return {
    ...render(
      <Router>
        <CoreServicesContext.Provider value={coreServicesMock}>
          <ServicesContext.Provider value={browserServicesMock}>
            <ServicesConsumer>
              {(services: BrowserServices | null) =>
                services && (
                  <ModalProvider>
                    <ModalRoot services={services} />
                    <Switch>
                      <Route
                        path={ROUTES.CREATE_ROLLUP}
                        render={(props: RouteComponentProps) => (
                          <div style={{ padding: "25px 25px" }}>
                            <CreateRollupForm
                              {...props}
                              rollupService={services.rollupService}
                              indexService={services.indexService}
                              core={coreServicesMock}
                            />
                          </div>
                        )}
                      />
                      <Route path={ROUTES.ROLLUPS} render={(props) => <div>Testing rollup landing page</div>} />
                      <Redirect from="/" to={ROUTES.CREATE_ROLLUP} />
                    </Switch>
                  </ModalProvider>
                )
              }
            </ServicesConsumer>
          </ServicesContext.Provider>
        </CoreServicesContext.Provider>
      </Router>
    ),
  };
}

describe("<CreateRollupForm /> spec", () => {
  const userEvent = userEventModule.setup();

  it("renders the component", async () => {
    const { container } = renderCreateRollupFormWithRouter();

    expect(container.firstChild).toMatchSnapshot();
  });

  it("sets breadcrumbs when mounting", async () => {
    renderCreateRollupFormWithRouter();

    expect(coreServicesMock.chrome.setBreadcrumbs).toHaveBeenCalledTimes(4);
    expect(coreServicesMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      BREADCRUMBS.INDEX_MANAGEMENT,
      BREADCRUMBS.ROLLUPS,
      BREADCRUMBS.CREATE_ROLLUP,
    ]);
  });

  it("routes back to rollup landing page if cancelled", async () => {
    const { getByTestId, getByText } = renderCreateRollupFormWithRouter();

    expect(getByTestId("createRollupCancelButton")).toBeEnabled();

    await userEvent.click(getByTestId("createRollupCancelButton"));

    await waitFor(() => getByText("Testing rollup landing page"));
  });

  it("will show error on step 1", async () => {
    const { getByTestId, queryByText } = renderCreateRollupFormWithRouter();

    expect(getByTestId("createRollupNextButton")).toBeEnabled();

    await userEvent.click(getByTestId("createRollupNextButton"));

    expect(queryByText("Job name is required.")).not.toBeNull();

    expect(queryByText("Source index is required.")).not.toBeNull();

    expect(queryByText("Target index is required.")).not.toBeNull();
  });
});

describe("<CreateRollupForm /> creation", () => {
  const userEvent = userEventModule.setup();

  browserServicesMock.indexService.getDataStreamsAndIndicesNames = jest.fn().mockResolvedValue({
    ok: true,
    response: {
      indices: ["index_1"],
      dataStreams: ["data_stream_1"],
    },
  });

  browserServicesMock.rollupService.getMappings = jest.fn().mockResolvedValue({
    ok: true,
    response: sampleMapping,
  });

  it("routes from step 1 to step 2 and back", async () => {
    const { getByTestId, getByLabelText, queryByText, getAllByTestId } = renderCreateRollupFormWithRouter();

    fireEvent.focus(getByLabelText("Name"));
    await userEvent.type(getByLabelText("Name"), "some_rollup_id");
    fireEvent.blur(getByLabelText("Name"));

    fireEvent.focus(getByTestId("description"));
    await userEvent.type(getByTestId("description"), "some description");
    fireEvent.blur(getByTestId("description"));

    await userEvent.type(getAllByTestId("comboBoxSearchInput")[0], "index_1");
    fireEvent.keyDown(getAllByTestId("comboBoxSearchInput")[0], { key: "Enter", code: "Enter" });

    await userEvent.type(getAllByTestId("comboBoxSearchInput")[1], "some_target_index");
    fireEvent.keyDown(getAllByTestId("comboBoxSearchInput")[1], { key: "Enter", code: "Enter" });

    await userEvent.click(getByTestId("createRollupNextButton"));

    expect(queryByText("Job name is required.")).toBeNull();

    expect(queryByText("Source index is required.")).toBeNull();

    expect(queryByText("Target index is required.")).toBeNull();

    //Check that it routes to step 2
    expect(queryByText("Timestamp field")).not.toBeNull();
  });

  it("routes from step 1 to step 4", async () => {
    const rollup = {
      _id: "some_rollup_id",
      _version: 3,
      _seq_no: 7,
      _primary_term: 1,
      rollup: {
        rollup_id: "some_rollup_id",
        enabled: true,
        schedule: {
          interval: {
            period: 1,
            unit: "Minutes",
            start_time: 1602100553,
          },
        },
        last_updated_time: 1602100553,
        description: "some description",
        source_index: "index_1",
        target_index: "some_target_index",
        page_size: 1000,
        delay: 0,
        continuous: false,
        metadata_id: null,
        enabledTime: null,
        lastUpdatedTime: null,
        schemaVersion: 1,
        dimensions: [],
        metrics: [],
      },
    };
    browserServicesMock.rollupService.putRollup = jest.fn().mockResolvedValue({
      ok: true,
      response: rollup,
    });
    const { getByTestId, getByLabelText, queryByText, getAllByTestId } = renderCreateRollupFormWithRouter();

    fireEvent.focus(getByLabelText("Name"));
    await userEvent.type(getByLabelText("Name"), "some_rollup_id");
    fireEvent.blur(getByLabelText("Name"));

    fireEvent.focus(getByTestId("description"));
    await userEvent.type(getByTestId("description"), "some description");
    fireEvent.blur(getByTestId("description"));

    await userEvent.type(getAllByTestId("comboBoxSearchInput")[0], "index_1");
    fireEvent.keyDown(getAllByTestId("comboBoxSearchInput")[0], { key: "Enter", code: "Enter" });

    await userEvent.type(getAllByTestId("comboBoxSearchInput")[1], "some_target_index");
    fireEvent.keyDown(getAllByTestId("comboBoxSearchInput")[1], { key: "Enter", code: "Enter" });

    await userEvent.click(getByTestId("createRollupNextButton"));

    //Check that it routes to step 2
    expect(queryByText("Timestamp field")).not.toBeNull();

    //Select timestamp
    await userEvent.type(getByTestId("comboBoxSearchInput"), "order_date");
    await waitFor(() => {});
    fireEvent.keyDown(getByTestId("comboBoxSearchInput"), { key: "Enter", code: "Enter" });
    fireEvent.blur(getByTestId("comboBoxSearchInput"));

    await userEvent.click(getByTestId("createRollupNextButton"));
    expect(queryByText("Timestamp is required.")).toBeNull();

    //Check that it routes to step 3
    expect(queryByText("Enable job by default")).not.toBeNull();

    await userEvent.click(getByTestId("createRollupNextButton"));

    //Check that it routes to step 4
    expect(queryByText("Job name and indexes")).not.toBeNull();

    //Test create
    await userEvent.click(getByTestId("createRollupSubmitButton"));
    await waitFor(() => {});

    expect(browserServicesMock.rollupService.putRollup).toHaveBeenCalledTimes(1);
    expect(coreServicesMock.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(coreServicesMock.notifications.toasts.addSuccess).toHaveBeenCalledWith(`Created rollup: some_rollup_id`);
  });

  it("can set all values on step 2", async () => {
    const { getByTestId, getByLabelText, queryByText, getAllByTestId, getByDisplayValue, getByText } = renderCreateRollupFormWithRouter();

    await userEvent.type(getByLabelText("Name"), "some_rollup_id");
    await userEvent.click(document.body);

    await userEvent.type(getByTestId("description"), "some description");
    await userEvent.click(document.body);
    await userEvent.type(getAllByTestId("comboBoxSearchInput")[0], "index_1");
    await waitFor(() => {});
    await userEvent.type(getAllByTestId("comboBoxSearchInput")[0], "{enter}");
    await userEvent.type(getAllByTestId("comboBoxSearchInput")[1], "some_target_index");
    await waitFor(() => {});
    await userEvent.type(getAllByTestId("comboBoxSearchInput")[1], "{enter}");
    await userEvent.click(getByTestId("createRollupNextButton"));

    //Check that it routes to step 2
    expect(queryByText("Timestamp field")).not.toBeNull();

    //Select timestamp
    await userEvent.type(getByTestId("comboBoxSearchInput"), "order_date");
    await waitFor(() => {});
    await userEvent.type(getByTestId("comboBoxSearchInput"), "{enter}");
    await userEvent.click(document.body);

    //Test calendar interval
    await userEvent.click(getByLabelText("Calendar"));
    expect(queryByText("Every 1")).not.toBeNull();

    //Test change interval
    await userEvent.click(getByDisplayValue("Hour"));
    await waitFor(() => getByText("Week"));
    await userEvent.click(getByText("Week"));

    //Test change timezone
    await userEvent.click(getByLabelText("Timezone"));
    await waitFor(() => getByText("America/Los_Angeles"));
    await userEvent.click(getByText("America/Los_Angeles"));

    //Test add aggregation
    await userEvent.dblClick(getByTestId("addFieldsAggregation"));
    await userEvent.click(getByTestId("checkboxSelectRow-day_of_week_i"));
    await userEvent.click(getByTestId("checkboxSelectRow-day_of_week"));
    await userEvent.click(getByText("Add"));

    //Go back to step 1 and check for callout
    await userEvent.click(getByTestId("createRollupPreviousButton"));
    expect(queryByText("Note: changing source index will erase all existing definitions about aggregations and metrics.")).not.toBeNull();

    //Go to step 2 and continue
    await userEvent.click(getByTestId("createRollupNextButton"));

    //Test cancel add field to close modal
    await userEvent.dblClick(getByTestId("addFieldsAggregation"));
    await userEvent.click(getByTestId("addFieldsAggregationCancel"));

    //Test add aggregation second time
    await userEvent.dblClick(getByTestId("addFieldsAggregation"));
    await userEvent.click(getByTestId("checkboxSelectRow-customer_gender"));
    await userEvent.click(getByText("Add"));

    //TODO: Test change aggregation method, cannot proceed due to getElementError for Histogram option

    // userEvent.click(getByTestId("aggregationMethodSelect-day_of_week_i"));
    // await waitFor(() => getByText("Histogram"));
    // userEvent.click(getByText("Histogram"));

    //Test move up/down of aggregations
    await userEvent.click(getByTestId("moveDown-day_of_week_i"));
    await userEvent.click(getByTestId("moveUp-day_of_week_i"));

    //TODO: Test delete aggregation, cannot proceed due to getElementError for delete button

    // userEvent.click(getByTestId("delete-customer_gender"));
    // expect(queryByText("customer_gender")).toBeNull();

    //Test add metric
    await userEvent.dblClick(getByTestId("addFieldsMetric"));
    await userEvent.click(getByTestId("checkboxSelectAll"));
    await userEvent.click(getByText("Add"));

    //TODO: Test error message of no method selected for metrics calculation.

    // userEvent.click(getByTestId("createRollupNextButton"));
    // expect(queryByText("Must specify at least one metric to aggregate on for:")).not.toBeNull();

    //Test enable all min of metrics
    await userEvent.click(getByText("Enable all"));
    await userEvent.click(getByTestId("enable_min"));

    //Test select and unselect all
    await userEvent.click(getByTestId("all-day_of_week_i"));
    await userEvent.click(getByTestId("all-day_of_week_i"));

    //Test disable all min of metrics
    await userEvent.click(getByText("Disable all"));

    //Test disable all max of metrics
    await userEvent.click(getByTestId("disable_max"));

    //Check that it routes to step 3
    await userEvent.click(getByTestId("createRollupNextButton"));
    expect(queryByText("Timestamp is required.")).toBeNull();
    expect(queryByText("Enable job by default")).not.toBeNull();

    //Test not enabled by default
    await userEvent.click(getByTestId("jobEnabledByDefault"));

    //Test continuous
    await userEvent.click(getByLabelText("Yes"));

    //Check that it routes to step 4
    await userEvent.click(getByTestId("createRollupNextButton"));
    expect(queryByText("Job name and indexes")).not.toBeNull();
  }, 120000);
});
