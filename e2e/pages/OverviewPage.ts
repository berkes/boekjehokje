import { expect, type Locator, type Page } from "@playwright/test";
import { SettingsPage } from "./SettingsPage.ts";

/**
 * The rooms of the makersplaats and their column headers on the board.
 */
const ROOM_COLUMNS: Readonly<Record<string, string>> = {
  "Kletshok 03": "KH 03",
  "Kletshok 04": "KH 04",
  "Kletshok 05": "KH 05",
  "Stilteruimte": "Stilteruimte",
  "Tuinkamer": "TK",
  "Vergaderruimte C3": "VG C3",
};

/**
 * The group that collects bookings without a matching room.
 */
const UNMATCHED_GROUP = "Unknown";

/**
 * The week overview: the board with the room columns, the bookings, the
 * day toolbar and the booking details.
 *
 * Tests pass the concrete rooms, bookings and labels they expect; the
 * page objects know how the app shows them: the selectors, the terms of
 * the details list, the shapes of the labels.
 */
export class OverviewPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Open the week overview.
   */
  async goto(): Promise<this> {
    await this.page.goto("/");
    await expect(this.toolbar().or(this.errorState())).toBeVisible();
    return this;
  }

  /**
   * Move the board one day forward.
   */
  async nextDay(): Promise<this> {
    await this.page.getByRole("button", { name: "Volgende" }).click();
    return this;
  }

  /**
   * Move the board one day back.
   */
  async previousDay(): Promise<this> {
    await this.page.getByRole("button", { name: "Vorige" }).click();
    return this;
  }

  /**
   * Move the board back to today.
   */
  async goToToday(): Promise<this> {
    await this.page.getByRole("button", { name: "Vandaag" }).click();
    return this;
  }

  /**
   * Hide a room's column and its bookings.
   */
  async hideRoom(room: string): Promise<this> {
    await this.roomChip(room).click();
    return this;
  }

  /**
   * Show a hidden room's column and bookings again.
   */
  async showRoom(room: string): Promise<this> {
    await this.roomChip(room).click();
    return this;
  }

  /**
   * Hide the group of bookings without a matching room.
   */
  async hideUnmatchedBookings(): Promise<this> {
    await this.roomChip(UNMATCHED_GROUP).click();
    return this;
  }

  /**
   * Open the details of the given booking.
   */
  async openBookingDetails(booking: string): Promise<this> {
    await this.bookingBar(booking).click();
    await expect(this.detailsTerm("Beschrijving")).toBeVisible();
    return this;
  }

  /**
   * Close the booking details.
   */
  async closeBookingDetails(): Promise<this> {
    await this.page.getByRole("button", { name: "Sluiten" }).click();
    return this;
  }

  /**
   * Try loading the overview again after an error.
   */
  async retryLoading(): Promise<this> {
    await this.page.getByRole("button", { name: "Opnieuw proberen" }).click();
    await expect(this.toolbar()).toBeVisible();
    return this;
  }

  /**
   * Continue to the settings page through the profile menu.
   */
  async openSettingsViaProfileMenu(): Promise<SettingsPage> {
    await this.page.getByRole("button", { name: "Instellingen openen" })
      .click();
    await this.page.getByRole("menuitem", { name: "Mijn account" }).click();
    return await new SettingsPage(this.page).waitUntilOpen();
  }

  /**
   * Assert every room of the makersplaats appears on the board.
   */
  async assertShowsAllRooms(): Promise<void> {
    for (const room of Object.keys(ROOM_COLUMNS)) {
      await this.assertShowsRoom(room);
    }
  }

  /**
   * Assert a room appears on the board.
   */
  async assertShowsRoom(room: string): Promise<void> {
    const column = this.roomColumn(room);
    if (column !== null) {
      await expect(column).toBeVisible();
    } else {
      await expect(this.roomChip(room)).toBeVisible();
    }
  }

  /**
   * Assert a booking is on the board.
   */
  async assertShowsBooking(booking: string): Promise<void> {
    await expect(this.bookingBar(booking)).toBeVisible();
  }

  /**
   * Assert a booking is not on the board.
   */
  async assertShowsNoBooking(booking: string): Promise<void> {
    await expect(this.bookingBar(booking)).toHaveCount(0);
  }

  /**
   * Assert a room's column and bookings are gone from the board.
   */
  async assertRoomIsHidden(room: string): Promise<void> {
    const column = this.roomColumn(room);
    if (column !== null) {
      await expect(column).toBeHidden();
    }
    await expect(this.bookingsOfRoom(room)).toHaveCount(0);
  }

  /**
   * Assert a room's column and bookings are on the board.
   */
  async assertRoomIsVisible(room: string): Promise<void> {
    const column = this.roomColumn(room);
    if (column !== null) {
      await expect(column).toBeVisible();
    }
    await expect(this.bookingsOfRoom(room).first()).toBeVisible();
  }

  /**
   * Assert the board shows the given day.
   */
  async assertShowsDay(label: string): Promise<void> {
    await expect(this.dayLabel()).toHaveText(label);
  }

  /**
   * Assert the overview shows its error state.
   */
  async assertShowsError(): Promise<void> {
    await expect(this.errorState()).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Opnieuw proberen" }),
    ).toBeVisible();
  }

  /**
   * Assert the group of bookings without a matching room is on the
   * board, set apart from the named rooms.
   */
  async assertShowsUnmatchedGroup(): Promise<void> {
    await expect(this.unmatchedGroup()).toHaveCount(2);
  }

  /**
   * Assert the group of unmatched bookings is hidden from the board.
   */
  async assertUnmatchedGroupIsHidden(): Promise<void> {
    await expect(this.unmatchedGroup()).toHaveCount(1);
  }

  /**
   * Assert the details describe the given booking.
   */
  async assertDetailsDescribe(booking: string): Promise<void> {
    await expect(this.detailsTerm("Beschrijving")).toBeVisible();
    await expect(this.page.getByText(booking)).toBeVisible();
  }

  /**
   * Assert the details show who made the booking.
   */
  async assertShowsBooker(name: string, email: string): Promise<void> {
    await expect(this.detailsTerm("Door")).toBeVisible();
    await expect(this.page.getByText(`${name} <${email}>`)).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: new RegExp(name) }),
    ).toBeVisible();
  }

  /**
   * Assert the details show the room of the booking.
   */
  async assertShowsRoomOfBooking(
    room: string,
    shortName: string,
  ): Promise<void> {
    await expect(this.detailsTerm("Ruimte")).toBeVisible();
    await expect(this.page.getByText(`${room} (${shortName})`)).toBeVisible();
  }

  /**
   * Assert the details show how long the booking lasts.
   */
  async assertShowsDuration(duration: string): Promise<void> {
    await expect(this.detailsTerm("Duur")).toBeVisible();
    await expect(this.page.getByText(duration)).toBeVisible();
  }

  /**
   * Assert the booking details are closed.
   */
  async assertBookingDetailsAreClosed(): Promise<void> {
    await expect(this.detailsTerm("Beschrijving")).toBeHidden();
  }

  /**
   * Assert a booking offers to edit and delete.
   */
  async assertBookingIsEditable(booking: string): Promise<void> {
    const bar = this.bookingBar(booking);
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("button", { name: "edit" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "delete" })).toBeVisible();
  }

  /**
   * Assert a booking offers details only.
   */
  async assertBookingIsReadOnly(booking: string): Promise<void> {
    const bar = this.bookingBar(booking);
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("button", { name: "info" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "edit" })).toBeHidden();
    await expect(bar.getByRole("button", { name: "delete" })).toBeHidden();
  }

  /**
   * The toolbar of the loaded overview: proof the board is up.
   */
  private toolbar(): Locator {
    return this.page.getByRole("button", { name: "Vandaag" });
  }

  /**
   * The error state of the overview.
   */
  private errorState(): Locator {
    return this.page.getByText("Fout:", { exact: false });
  }

  /**
   * The bar of one booking on the board.
   */
  private bookingBar(booking: string): Locator {
    return this.page.locator(`button [title="${booking}"]`);
  }

  /**
   * The booking bars of one room.
   */
  private bookingsOfRoom(room: string): Locator {
    return this.page.locator(`button [title^="${room} -"]`);
  }

  /**
   * The chip toggling a room's column.
   */
  private roomChip(room: string): Locator {
    return this.page.getByText(room, { exact: true }).first();
  }

  /**
   * The column header of a room, or null when it cannot be told apart
   * from the chip (the room whose column header repeats its name).
   */
  private roomColumn(room: string): Locator | null {
    const column = ROOM_COLUMNS[room];
    if (column === undefined) {
      throw new Error(`Unknown room: ${room}`);
    }
    return column === room
      ? null
      : this.page.getByText(column, { exact: true });
  }

  /**
   * The group of unmatched bookings: its chip and its board column.
   */
  private unmatchedGroup(): Locator {
    return this.page.getByText(UNMATCHED_GROUP, { exact: true });
  }

  /**
   * The label showing the selected day.
   */
  private dayLabel(): Locator {
    return this.page.locator('[aria-live="polite"]');
  }

  /**
   * A term of the booking details.
   */
  private detailsTerm(term: string): Locator {
    return this.page.getByText(term, { exact: true });
  }
}
