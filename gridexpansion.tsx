import * as React from "react";
import { Button, IconButton } from "@material-ui/core";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import Pagination from "material-ui-flat-pagination";
import _ from "underscore";
import ClientSettingDetails from "../ClientSettingDetails/clientSettingDetails";
import { OrganizationsList, Organization, UserEntitySetting } from "src/models/client";
import SearchInput from "../Search/Search";
import { saveEntity, GetListOfEntities, updateEntity, GetAllClientNames } from "./ClientSettingsService";
import { PagingFilter } from "src/models";
import "./ClientSettings.scss";
import { Redirect } from "react-router";
import { NotificationContentPopover } from "../Notifications/NotificationContentPopover";
import { NotificationSwitch } from "./NotificationSwitch";
import ProgressBar from "../ProgressBar/ProgressBar"
import { element } from "prop-types";
import { grey } from "@material-ui/core/colors";
import { addStyle } from "react-bootstrap/lib/utils/bootstrapUtils";
import { User } from "src/models/index";

type Props = {
    minimized: boolean;
    onUpdate: any;
};

type State = {
    gridData: Organization[];
    addBtnDisabled: boolean;
    total: number;
    editMode: boolean;
    pagingFilter: PagingFilter;
};

type RowProps = {
    notifications: boolean;
    ClientName: any;
    EntityCode: any;
    DisplayName: any;
    DisplayCode: any;
    LocationType: any;
    debounce: any;
    settingsConfigured: boolean;
};

const theme = createMuiTheme({
    palette: {
        primary: {
            main: "#003b49",
        },
    },
    typography: {
        useNextVariants: true,
    },
});

export class ClientSettings extends React.Component<Props, State> {
    state: State;
    props: Props;
    rowProps: RowProps;
    user: User;
    constructor(props: Props) {
        super(props);
        this.handleSortByCol = this.handleSortByCol.bind(this);
        this.state = {
            gridData: [],
            addBtnDisabled: false,
            total: 0,
            editMode: true,
            pagingFilter: {
                PageNumber: 1,
                PageSize: 10,
                SortOrder: 1,
                SortColumn: "datetime",
                Search: null,
            },
        };
    }

    /*<GET Entities>*/

    async getListOfEntities(): Promise<void> {
        this.setState({ ...this.state })
        var entities: OrganizationsList = await GetListOfEntities(this.state.pagingFilter);
        for (let item of entities.organizationalEntities) {
            item.DateCreated = new Date(item.DateCreated);
            item.DateModified = new Date(item.DateModified);
        }

        this.setState({ ...this.state, gridData: entities.organizationalEntities, total: entities.count });
           {/* {...this.state,
            gridData: entities.organizationalEntities,
           total: entities.count,  */}
    }

    componentDidMount() {
        this.getListOfEntities();
    }

    /* <Grid Row Expansion>*/

    toggleExpand = (item) => {
        const data = this.state.gridData;
        data.find(
            d => d.OrganizationClass === item.OrganizationClass && d.EntityCode === item.EntityCode
        ).Expand = !item.Expand;
        this.setState({ ...this.state, gridData: data });
    };

    /*<Search Entites>*/

    onSearch = term => {
        if (term && term.length >= 3) {
            this.setState({ pagingFilter: { ...this.state.pagingFilter, Search: term } }, async () => {
                await this.getListOfEntities();
            });
        } else {
            this.setState({ pagingFilter: { ...this.state.pagingFilter, Search: null } }, async () => {
                await this.getListOfEntities();
            });
        }
    };

    /*<Sort by Column>*/

    async handleSortByCol(col): Promise<void> {
        var updatedPagingFilter = this.state.pagingFilter;

        if (col === this.state.pagingFilter.SortColumn) {
            updatedPagingFilter.SortOrder = this.state.pagingFilter.SortOrder == 0 ? 1 : 0;
        } else {
            updatedPagingFilter.SortOrder = col === "DisplayName" ? 0 : this.state.pagingFilter.SortOrder;
        }

        updatedPagingFilter.SortColumn = col;
        updatedPagingFilter.PageNumber = 1;

        this.setState({ pagingFilter: updatedPagingFilter }, async () => {
            await this.getListOfEntities();
        });
    }

    /*<ADDING A NEW CLIENT>*/

    addNewClient = () => {
        let newItem: Organization = {
            OrganizationClass: "",
            EntityCode: "",
            DisplayCode: "",
            DisplayName: "",
            LocationType: "",
            DateCreated: new Date(),
            DateModified: new Date(),
            OrganizationSettings: [],
            OrganizationalSettings: [],
            New: true,
            Expand: true,
            Edit: true,
            ShowUserEntitySettings: {
                ShowNotifications: false,
            },
        };

        let data = this.state.gridData;
        data.unshift(newItem);
        this.setState({ gridData: data, addBtnDisabled: true });
    };

    /*<Pagination>*/

    async handlePageChange(offset): Promise<void> {
        var updatedPagingFilter = {
            PageNumber: this.state.pagingFilter.PageNumber,
            PageSize: this.state.pagingFilter.PageSize,
            SortOrder: this.state.pagingFilter.SortOrder,
            SortColumn: this.state.pagingFilter.SortColumn,
            Search: this.state.pagingFilter.Search,
        };

        updatedPagingFilter.PageNumber = Math.floor(offset / updatedPagingFilter.PageSize) + 1;
        this.setState({ pagingFilter: updatedPagingFilter }, async () => {
            await this.getListOfEntities();
        });
    }

    /*<Submit>*/

    onSubmit = async item => {
        if (item.New) {
            const result = await saveEntity(item);
            if (result) {
                this.getListOfEntities();
            }
            this.setState({ ...this.state, addBtnDisabled: false });
        } else {
            const result = await updateEntity(item);
            if (result) {
                this.getListOfEntities();
            }
        }
    };

    /*<Client Settings Grid>*/

    public render(): JSX.Element {
        let rows =
            this.state.gridData.length == 0 ? (
                <div className="row">
                    {" "}
                    <div className="col-lg-12">
                        <div className="grid-item">No clients configured</div>
                    </div>
                </div>
            ) : (
                    this.state.gridData.map((element, key) => (
                        <div key={key}>

                            <div className="row table-row border-between">
                                <div className="col-lg-1">
                                    <div className="grid-item">
                                    <NotificationSwitch
                                        userEntitySetting={{
                                            EntityClass: element.OrganizationClass,
                                            EntityCode: element.EntityCode,
                                            ShowNotifications:
                                                element.DotoUserEntitySetting == null
                                                    ? false
                                                    : element.DotoUserEntitySetting.ShowNotifications,
                                        }}
                                        />
                                    </div>
                                </div>
                                <div className="col-lg-2">
                                    <div className="grid-item">{element.OrganizationClass}</div>
                                </div>
                                <div className="col-lg-1">
                                    <div className="grid-item">{element.EntityCode}</div>
                                </div>
                                <div className="col-lg-2">
                                    <div className="grid-item">
                                        <NotificationContentPopover content={element.DisplayName} />
                                    </div>
                                </div>
                                <div className="col-lg-1">
                                    <div className="grid-item">
                                        {
                                            element.OrganizationalSettings.find(x => x.SettingKey == "LOCATION_TYPE") ?
                                                element.OrganizationalSettings.find(x => x.SettingKey == "LOCATION_TYPE").SettingValue : ''
                                        }
                                    </div>
                                </div>
                                <div className="col-lg-2">
                                    <div className="grid-item">
                                        {element.DateCreated.toLocaleDateString() +
                                            " " +
                                            element.DateCreated.toLocaleTimeString()}
                                    </div>
                                </div>
                                <div className="col-lg-3">
                                    <div className="grid-item">
                                        {element.DateCreated.toLocaleDateString() +
                                            " " +
                                            element.DateCreated.toLocaleTimeString()} &nbsp;&nbsp;

                                     <span onClick={() => this.toggleExpand(element)} className={element.Expand ? " fa-expand fa fa-caret-up" : "fa-expand fa fa-caret-down"}></span>

                                    </div>
                                </div>
                                {element.Expand && <ClientSettingDetails client={element} onSubmit={this.onSubmit} key={key} />}
                            </div>
                        </div>

                    ))
                );

        const paginationRow = (
            <Pagination
                total={this.state.total}
                offset={(this.state.pagingFilter.PageNumber - 1) * this.state.pagingFilter.PageSize}
                limit={this.state.pagingFilter.PageSize}
                onClick={(a, offset) => this.handlePageChange(offset)}
                className="pull-right"
            />
        );

        return (
            <MuiThemeProvider theme={theme}>
                <div className="client-settings">
                    <h4>GLOBAL CLIENT STATUS AND SETTINGS</h4>
                    <div>
                        <div className="row">
                            <div className="col-lg-2">
                                <Button className="position"
                                    variant="contained"
                                    color="primary"
                                    onClick={this.addNewClient}
                                    disabled={this.state.addBtnDisabled}>
                                    <i className="fa fa-plus-circle i" />
                                    Add Client
                            </Button>
                            </div>
                            <div className="col-lg-5 col-lg-offset-5 pull-right Search">
                                <SearchInput onSearch={this.onSearch} debounceTimeout={1500} />
                            </div>
                        </div>
                        <div className="container header">
                            <div className="row table-row border-between">
                                <div className="col-lg-1 grid-item">
                                    <IconButton>
                                        <i className="fa fa-bell header" />
                                    </IconButton>
                                </div>
                                <div className="col-lg-2 grid-header align">Organization Class</div>
                                <div className="col-lg-1 grid-header">Entity Code</div>
                                <div className="col-lg-2 grid-header sort" onClick={() => this.handleSortByCol("DisplayName")}>Display Name
                            {this.state.pagingFilter.SortColumn === "DisplayName"
                                        ? this.state.pagingFilter.SortOrder === 0
                                            ? " ↓ "
                                            : " ↑ "
                                        : " ↓ ↑ "}
                                </div>
                                <div className="col-lg-1 grid-header">Location Type</div>
                                <div className="col-lg-2 grid-header">Date Created</div>
                                <div className="col-lg-3 grid-header sort" onClick={() => this.handleSortByCol("datetime")}>Date Modified
                        {this.state.pagingFilter.SortColumn === "datetime"
                                        ? this.state.pagingFilter.SortOrder === 0
                                            ? " ↓ "
                                            : " ↑ "
                                        : " ↓ ↑ "}
                                </div>

                            </div>
                            <div className="position-relative ">
                                <ProgressBar />{rows}</div>
                            <div className="row">
                                <div className="col-lg-3 font-weight-bold">ClientSettingsCount :{this.state.total}</div>
                                <div className="col-lg-7 col-lg-offset-2">{paginationRow}</div>
                            </div>
                        </div>

                    </div>
                </div>
            </MuiThemeProvider>
        );
    }
}
