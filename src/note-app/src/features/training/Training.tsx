import React from "react";
import { Button, Container, Row, Col, Navbar, Form, FormControl, Nav, Card } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { NativeText } from "../../components/NativeText";
import { selectState, selectCurrent, setSpreadsheetId, next, prev, load, toggleVisibility } from "./trainingSlice";

export function Training() {
    const {spreadsheetId, visibility, state} = useSelector(selectState);
    const current = useSelector(selectCurrent);
    const dispatch = useDispatch();
    return (
        <div>
            <Navbar variant="dark" bg="dark">
                <Form inline>
                    <FormControl
                        type="text"
                        value={spreadsheetId || ''}
                        className="mr-sm-2"
                        onChange={(e) => dispatch(setSpreadsheetId(e.target.value))}
                    />
                    <Button
                        variant="outline-info"
                        onClick={() => dispatch(load())}
                    >Load</Button>
                </Form>
            </Navbar>
            <Container fluid>
                {(() => {switch (state) {
                    case 'READY': {return (
                        <Row><Col>
                            <p>^ INPUT SPREADSHEET ID</p>
                        </Col></Row>
                    );}
                    case 'LOADING': {return (
                        <Row><Col>
                            <p>LOADING</p>
                        </Col></Row>
                    );}
                    case 'FAILED': {return (
                        <Row><Col>
                            <p>FAILED</p>
                        </Col></Row>
                    );}
                    case 'LOADED': {return (
                        <Row><Col>
                            <Card className="mt-3">
                                <Card.Header>JA</Card.Header>
                                <Card.Body>{current?.ja}</Card.Body>
                            </Card>
                            <Card className="mt-3">
                                <Card.Header>EN</Card.Header>
                                <Card.Body className={visibility === 'SHOWN' ? 'vibible' : 'invisible'}>
                                    <NativeText className="text-body">{current?.en}</NativeText>
                                </Card.Body>
                            </Card>
                        </Col></Row>
                    );}
                }})()}
            </Container>
            <Navbar fixed="bottom" variant="dark" bg="dark">
                <Container fluid>
                    <Nav className="ms-auto">
                        <Button
                            variant="outline-info"
                            onClick={() => dispatch(prev())}
                        >Prev</Button>
                    </Nav>
                    <Nav className="me-auto ms-auto">
                        <Button
                            variant="outline-info"
                            onClick={() => dispatch(toggleVisibility())}
                        >TOGGLE ANSWER</Button>
                    </Nav>
                    <Nav className="me-auto">
                        <Button
                            className="me-auto"
                            variant="outline-info"
                            onClick={() => dispatch(next())}
                        >Next</Button>
                    </Nav>
                </Container>
            </Navbar>
        </div>
    );
};
